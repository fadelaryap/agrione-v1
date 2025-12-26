'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { notificationsAPI, Notification, NotificationsResponse } from '@/lib/api'
import { formatDateIndonesian } from '@/lib/dateUtils'
import { wsClient } from '@/lib/websocket'

interface NotificationBellProps {
  userRole?: string
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const previousNotificationIdsRef = useRef<Set<number>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const loadNotifications = useCallback(async () => {
    // Load for Level 1, 2, 3, and 4
    if (!userRole || (userRole !== 'Level 1' && userRole !== 'Level 2' && userRole !== 'Level 3' && userRole !== 'Level 4')) {
      return
    }

    try {
      setLoading(true)
      const data = await notificationsAPI.getNotifications()
      
      // Check for new notifications
      const currentIds = new Set(data.notifications.map(n => n.id))
      const previousIds = previousNotificationIdsRef.current
      const newNotifications = data.notifications.filter(n => !previousIds.has(n.id))
      
      // Show toast for new notifications (only after first load)
      if (previousIds.size > 0 && newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
            action: {
              label: 'Lihat',
              onClick: () => {
                router.push(notification.link)
              }
            }
          })
        })
      }
      
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
      previousNotificationIdsRef.current = currentIds
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [userRole, router])

  useEffect(() => {
    // Load notifications on mount
    loadNotifications()

    // Connect WebSocket for real-time updates
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      wsClient.connect(token, {
        onNotification: (notification) => {
          // Add new notification to the list
          setNotifications(prev => [notification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Show toast
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
            action: {
              label: 'Lihat',
              onClick: () => {
                router.push(notification.link)
              }
            }
          })
        },
        onError: (error) => {
          console.error('WebSocket error:', error)
        },
        onClose: () => {
          console.log('WebSocket closed')
        }
      })
    }

    return () => {
      wsClient.disconnect()
    }
  }, [loadNotifications, router])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Show for Level 1, 2, 3, and 4
  if (!userRole || (userRole !== 'Level 1' && userRole !== 'Level 2' && userRole !== 'Level 3' && userRole !== 'Level 4')) {
    return null
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await notificationsAPI.markAsRead(notification.id)
        // Update local state
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }
    
    setIsOpen(false)
    router.push(notification.link)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'field_report_pending':
        return '📋'
      case 'field_report_comment':
        return '💬'
      case 'work_order_new':
        return '📝'
      case 'field_report_processed':
        return '✅'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'field_report_pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'field_report_comment':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'work_order_new':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'field_report_processed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifikasi</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500">Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-semibold truncate ${!notification.read ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2.5 h-2.5 bg-indigo-600 rounded-full ml-2 animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {formatDateIndonesian(notification.created_at)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${getNotificationColor(notification.type)}`}>
                            {notification.type === 'field_report_pending' && 'Menunggu'}
                            {notification.type === 'field_report_comment' && 'Komentar'}
                            {notification.type === 'work_order_new' && 'Work Order'}
                            {notification.type === 'field_report_processed' && 'Diproses'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link
                href="/dashboard/field-reports-approval"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Lihat Semua Notifikasi
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

