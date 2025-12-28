'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { authAPI, User, workOrdersAPI, WorkOrder, fieldReportsAPI, FieldReport, FieldReportComment, fieldsAPI, Field, stockRequestsAPI, StockRequest, inventoryAPI, InventoryItem } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Calendar, MapPin, User as UserIcon, Clock, CheckCircle, AlertCircle, MessageSquare, Send, Camera, Video, ArrowLeft, Image as ImageIcon, X, Navigation, Package } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

export default function WorkOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const workOrderId = params?.id ? parseInt(params.id as string) : null

  const [user, setUser] = useState<User | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [field, setField] = useState<Field | null>(null)
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([])
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState<{ [reportId: number]: string }>({})
  const [submittingComment, setSubmittingComment] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null)

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
      loadStockRequests()
      loadInventoryItems()
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
      
      // Load field details if field_id exists
      if (wo.field_id) {
        try {
          const fieldData = await fieldsAPI.getField(wo.field_id)
          setField(fieldData)
        } catch (err) {
          console.error('Failed to load field:', err)
        }
      }
    } catch (err) {
      console.error('Failed to load work order:', err)
    }
  }

  const openGoogleMaps = () => {
    if (!field || !field.coordinates) {
      toast.error('Koordinat field tidak tersedia')
      return
    }

    let lat: number, lng: number

    // Handle different coordinate formats
    if (field.draw_type === 'circle' && field.coordinates.center) {
      // Circle: use center
      lat = field.coordinates.center[0]
      lng = field.coordinates.center[1]
    } else if (Array.isArray(field.coordinates) && field.coordinates.length > 0) {
      // Polygon: use first point
      lat = field.coordinates[0][0]
      lng = field.coordinates[0][1]
    } else if (field.coordinates.latitude && field.coordinates.longitude) {
      // Point format
      lat = field.coordinates.latitude
      lng = field.coordinates.longitude
    } else {
      toast.error('Format koordinat tidak didukung')
      return
    }

    // Open Google Maps with navigation
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank')
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

  const loadStockRequests = async () => {
    if (!workOrderId) return
    try {
      const requests = await stockRequestsAPI.listStockRequests({ work_order_id: workOrderId })
      setStockRequests(requests || [])
    } catch (err) {
      console.error('Failed to load stock requests:', err)
      setStockRequests([])
    }
  }

  const loadInventoryItems = async () => {
    try {
      const items = await inventoryAPI.listItems({})
      setInventoryItems(items || [])
    } catch (err) {
      console.error('Failed to load inventory items:', err)
      setInventoryItems([])
    }
  }

  const getRequestStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'fulfilled': 'bg-blue-100 text-blue-800 border-blue-200',
      'cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getItemName = (itemId: number) => {
    const item = inventoryItems.find(i => i.id === itemId)
    return item ? `${item.sku} - ${item.name}` : `Item #${itemId}`
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
      <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
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
                  {workOrder.field_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {workOrder.field_name}
                    </span>
                  )}
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
              {field && field.coordinates && (
                <button
                  onClick={openGoogleMaps}
                  className="ml-4 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
                  title="Buka di Google Maps"
                >
                  <Navigation className="w-5 h-5" />
                  <span className="hidden sm:inline">Buka di Maps</span>
                </button>
              )}
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

            {/* Requirements */}
            {workOrder.requirements && workOrder.requirements.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Requirements:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {workOrder.requirements.map((req, idx) => (
                    <li key={idx} className="text-sm text-gray-600">{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Material Requirements */}
            {workOrder.material_requirements && workOrder.material_requirements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Material Requirements:
                </h3>
                <div className="space-y-2">
                  {workOrder.material_requirements.map((matReq, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{getItemName(matReq.item_id)}</span>
                        {matReq.warehouse_id && (
                          <span className="text-xs text-gray-500 ml-2">(Warehouse #{matReq.warehouse_id})</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{matReq.quantity} units</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Requests Section */}
        {stockRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Stock Requests ({stockRequests.length})
            </h2>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{request.request_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium">{request.item.name}</div>
                            <div className="text-sm text-gray-500">{request.item.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="font-medium">{request.quantity}</span>
                          <span className="text-gray-500 ml-1">{request.item.unit}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {request.warehouse ? (
                            <div>
                              <div className="text-sm font-medium">{request.warehouse.name}</div>
                              <div className="text-sm text-gray-500">{request.warehouse.type}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getRequestStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{request.requested_by}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.created_at ? format(parseISO(request.created_at), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                        {report.media.map((media: any, idx: number) => {
                          const imageUrl = media.url && (media.url.startsWith('http://') || media.url.startsWith('https://'))
                            ? media.url
                            : null
                          
                          return (
                            <div key={idx} className="relative">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={media.filename || `Image ${idx + 1}`}
                                  className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage({ url: imageUrl, filename: media.filename || `Image ${idx + 1}` })}
                                />
                              ) : media.type === 'video' && media.data ? (
                                <video
                                  src={`data:video/webm;base64,${media.data}`}
                                  className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50"
                                  controls
                                />
                              ) : media.url && (media.url.startsWith('http://') || media.url.startsWith('https://')) ? (
                                <img
                                  src={media.url}
                                  alt={media.filename || `Media ${idx + 1}`}
                                  className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage({ url: media.url, filename: media.filename || `Media ${idx + 1}` })}
                                />
                              ) : null}
                            </div>
                          )
                        })}
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

      {/* Image Popup Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="fixed top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-[101] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-2 text-sm">{selectedImage.filename}</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

