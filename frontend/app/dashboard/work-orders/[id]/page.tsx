'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { authAPI, User, workOrdersAPI, WorkOrder, fieldReportsAPI, FieldReport, FieldReportComment } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Calendar, MapPin, User as UserIcon, Clock, CheckCircle, AlertCircle, MessageSquare, Send, Camera, Video, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const workOrderId = params?.id ? parseInt(params.id as string) : null

  const [user, setUser] = useState<User | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState<{ [reportId: number]: string }>({})
  const [submittingComment, setSubmittingComment] = useState<number | null>(null)

  useEffect(() => {
    if (!workOrderId) {
      router.push('/dashboard/work-orders')
      return
    }
    checkAuth()
  }, [workOrderId])

  useEffect(() => {
    if (user && workOrderId) {
      loadWorkOrder()
      loadFieldReports()
    }
  }, [user, workOrderId])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role === 'superadmin') {
        router.push('/suadm')
        return
      }
      if (profile.role === 'Level 3' || profile.role === 'Level 4') {
        router.push('/lapangan')
        return
      }
      setUser(profile)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkOrder = async () => {
    if (!workOrderId) return
    try {
      const wo = await workOrdersAPI.getWorkOrder(workOrderId)
      setWorkOrder(wo)
    } catch (err) {
      console.error('Failed to load work order:', err)
    }
  }

  const loadFieldReports = async () => {
    if (!workOrderId) return
    try {
      const reports = await fieldReportsAPI.listFieldReports({ 
        work_order_id: workOrderId, 
        include_comments: true 
      })
      setFieldReports(reports || [])
    } catch (err) {
      console.error('Failed to load field reports:', err)
      setFieldReports([])
    }
  }

  const handleAddComment = async (reportId: number) => {
    const commentText = newComment[reportId]?.trim()
    if (!commentText || !user) return

    setSubmittingComment(reportId)
    try {
      const commentedBy = `${user.first_name} ${user.last_name}`
      await fieldReportsAPI.addComment(reportId, commentText, commentedBy)
      setNewComment({ ...newComment, [reportId]: '' })
      // Reload reports to get updated comments
      await loadFieldReports()
    } catch (err: any) {
      console.error('Failed to add comment:', err)
      alert('Failed to add comment: ' + (err.response?.data?.error || err.message))
    } finally {
      setSubmittingComment(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !workOrder) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-700 mb-4 text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work Orders
          </button>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{workOrder.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {workOrder.start_date && workOrder.end_date ? (
                      `${format(parseISO(workOrder.start_date), 'MMM dd, yyyy')} - ${format(parseISO(workOrder.end_date), 'MMM dd, yyyy')}`
                    ) : 'No dates'}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    {workOrder.assignee}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    workOrder.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    workOrder.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    workOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                    workOrder.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {workOrder.status?.replace('-', ' ').toUpperCase() || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-bold text-indigo-600">{workOrder.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${workOrder.progress || 0}%` }}
                />
              </div>
            </div>

            {workOrder.description && (
              <p className="mt-4 text-gray-700">{workOrder.description}</p>
            )}
          </div>
        </div>

        {/* Field Reports */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Field Reports ({fieldReports.length})
          </h2>
          
          {fieldReports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
              <p className="text-gray-600">
                No field reports have been submitted for this work order yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {fieldReports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {report.created_at ? format(parseISO(report.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          {report.submitted_by}
                        </span>
                        {report.coordinates && typeof report.coordinates === 'object' && 'latitude' in report.coordinates && 'longitude' in report.coordinates && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {(report.coordinates as any).latitude?.toFixed(4)}, {(report.coordinates as any).longitude?.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                      report.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                      report.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.condition?.toUpperCase() || 'N/A'}
                    </span>
                  </div>

                  {report.description && (
                    <p className="text-gray-700 mb-4">{report.description}</p>
                  )}

                  {/* Media */}
                  {report.media && Array.isArray(report.media) && report.media.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        {report.media.some((m: any) => m.type === 'image') && <ImageIcon className="w-4 h-4 text-gray-600" />}
                        {report.media.some((m: any) => m.type === 'video') && <Video className="w-4 h-4 text-gray-600" />}
                        <span className="text-sm font-medium text-gray-700">
                          {report.media.length} {report.media.length === 1 ? 'file' : 'files'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {report.media.map((media: any, idx: number) => (
                          <div key={idx} className="relative">
                            {media.type === 'image' && media.data ? (
                              <img
                                src={`data:image/jpeg;base64,${media.data}`}
                                alt={media.filename || `Image ${idx + 1}`}
                                className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                              />
                            ) : media.type === 'video' && media.data ? (
                              <video
                                src={`data:video/webm;base64,${media.data}`}
                                className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                controls
                              />
                            ) : media.url ? (
                              <img
                                src={media.url}
                                alt={media.filename || `Media ${idx + 1}`}
                                className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700"><strong>Notes:</strong> {report.notes}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comments ({report.comments?.length || 0})
                    </h4>

                    {/* Existing Comments */}
                    {report.comments && report.comments.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {report.comments.map((comment, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium text-gray-900 text-sm">{comment.commented_by}</p>
                              <span className="text-xs text-gray-500">
                                {format(parseISO(comment.created_at), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment[report.id] || ''}
                        onChange={(e) => setNewComment({ ...newComment, [report.id]: e.target.value })}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment(report.id)
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(report.id)}
                        disabled={!newComment[report.id]?.trim() || submittingComment === report.id}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        {submittingComment === report.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

