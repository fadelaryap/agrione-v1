'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usersAPI, User } from '@/lib/api'
import { authAPI } from '@/lib/api'

export default function SuperAdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [editingStatus, setEditingStatus] = useState<User | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  const roles = ['superadmin', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'user']

  useEffect(() => {
    checkAuth()
    loadUsers()
  }, [currentPage])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role !== 'superadmin') {
        router.push('/dashboard')
      }
    } catch (err) {
      router.push('/login')
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await usersAPI.listUsers(currentPage, pageSize)
      setUsers(response.users)
      setTotalPages(response.total_pages)
      setTotal(response.total)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setSelectedRole(user.role)
  }

  const handleEditStatusClick = (user: User) => {
    setEditingStatus(user)
    setSelectedStatus(user.status || 'pending')
  }

  const handleUpdateRole = async () => {
    if (!editingUser) return

    setUpdating(true)
    try {
      await usersAPI.updateUserRole(editingUser.id, selectedRole)
      await loadUsers()
      setEditingUser(null)
      setSelectedRole('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!editingStatus) return

    setUpdating(true)
    try {
      await usersAPI.updateUserStatus(editingStatus.id, selectedStatus)
      await loadUsers()
      setEditingStatus(null)
      setSelectedStatus('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Level 1':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Level 2':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Level 3':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Level 4':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
                <p className="text-purple-100 mt-2">Manage users and their roles</p>
              </div>
              <div className="text-right">
                <p className="text-purple-100 text-sm">Total Users</p>
                <p className="text-white text-2xl font-bold">{total}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Edit Status Modal */}
            {editingStatus && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Update User Status</h2>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">User:</p>
                    <p className="font-semibold text-gray-900">
                      {editingStatus.first_name} {editingStatus.last_name} ({editingStatus.email})
                    </p>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleUpdateStatus}
                      disabled={updating}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updating ? 'Updating...' : 'Update Status'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingStatus(null)
                        setSelectedStatus('')
                      }}
                      disabled={updating}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Role Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Update User Role</h2>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">User:</p>
                    <p className="font-semibold text-gray-900">
                      {editingUser.first_name} {editingUser.last_name} ({editingUser.email})
                    </p>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleUpdateRole}
                      disabled={updating}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {updating ? 'Updating...' : 'Update Role'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(null)
                        setSelectedRole('')
                      }}
                      disabled={updating}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                                user.status || 'pending'
                              )}`}
                            >
                              {user.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="text-purple-600 hover:text-purple-900 font-medium transition-colors"
                            >
                              Edit Role
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleEditStatusClick(user)}
                              className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                            >
                              {user.status === 'approved' ? 'Change Status' : 'Approve/Reject'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

