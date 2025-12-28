'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, User, inventoryAPI, InventoryItem, StockLot, StockMovement, InventoryStats, Warehouse } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Package, Warehouse as WarehouseIcon, TrendingDown, AlertTriangle, BarChart3, Package2, Edit, Trash2, Minus, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function InventoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'items' | 'lots' | 'warehouses' | 'movements'>('items')

  // Data states
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stockLots, setStockLots] = useState<StockLot[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [movementTypeFilter, setMovementTypeFilter] = useState('all')

  // Dialog states
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [isRemoveStockOpen, setIsRemoveStockOpen] = useState(false)
  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [selectedLot, setSelectedLot] = useState<StockLot | null>(null)

  // Form states
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    category: '',
    unit: 'piece',
    reorder_point: 0,
    status: 'active',
    avg_cost: 0,
    description: '',
    suppliers: [] as string[]
  })

  const [newStockLot, setNewStockLot] = useState({
    item_id: '',
    warehouse_id: '',
    batch_no: '',
    quantity: 0,
    unit_cost: 0,
    expiry_date: '',
    supplier: '',
    notes: ''
  })

  const [removeStockData, setRemoveStockData] = useState({
    lot_id: '',
    quantity: 0,
    reason: '',
    reference: '',
    performed_by: user?.first_name + ' ' + user?.last_name || 'Current User',
    notes: ''
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const profile = await authAPI.getProfile()
      if (profile.role !== 'warehouse' && profile.role !== 'Level 1' && profile.role !== 'Level 2') {
        router.push('/dashboard')
        return
      }
      setUser(profile)
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const [statsData, itemsData, lotsData, warehousesData, movementsData] = await Promise.all([
        inventoryAPI.getStats(),
        inventoryAPI.listItems({ search: searchTerm, category: categoryFilter }),
        inventoryAPI.listStockLots({ search: searchTerm, warehouse: warehouseFilter, status: statusFilter }),
        inventoryAPI.listWarehouses({ search: searchTerm }),
        inventoryAPI.listMovements({ search: searchTerm, type: movementTypeFilter })
      ])
      setStats(statsData)
      setItems(itemsData)
      setStockLots(lotsData)
      setWarehouses(warehousesData)
      setMovements(movementsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      toast.error('Gagal memuat data inventory')
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [searchTerm, categoryFilter, warehouseFilter, statusFilter, movementTypeFilter, user])

  // Calculate total stock for an item
  const getTotalStock = (itemId: number) => {
    return stockLots
      .filter(lot => lot.item.id === itemId && lot.status === 'available')
      .reduce((sum, lot) => sum + lot.quantity, 0)
  }

  // Get low stock items
  const lowStockItems = items.filter(item => {
    const totalStock = getTotalStock(item.id)
    return totalStock <= item.reorder_point
  })

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // CRUD Functions
  const addItem = async () => {
    try {
      await inventoryAPI.createItem(newItem)
      toast.success('Item berhasil ditambahkan')
      setNewItem({
        sku: '',
        name: '',
        category: '',
        unit: 'piece',
        reorder_point: 0,
        status: 'active',
        avg_cost: 0,
        description: '',
        suppliers: []
      })
      setIsAddItemOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menambahkan item')
    }
  }

  const editItem = async () => {
    if (!editingItem) return
    try {
      await inventoryAPI.updateItem(editingItem.id, newItem)
      toast.success('Item berhasil diupdate')
      setEditingItem(null)
      setIsEditItemOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengupdate item')
    }
  }

  const deleteItem = async (itemId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return
    try {
      await inventoryAPI.deleteItem(itemId)
      toast.success('Item berhasil dihapus')
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus item')
    }
  }

  const addStock = async () => {
    try {
      await inventoryAPI.createStockLot({
        item_id: parseInt(newStockLot.item_id),
        warehouse_id: parseInt(newStockLot.warehouse_id),
        batch_no: newStockLot.batch_no,
        quantity: newStockLot.quantity,
        unit_cost: newStockLot.unit_cost,
        expiry_date: newStockLot.expiry_date || undefined,
        supplier: newStockLot.supplier,
        notes: newStockLot.notes || undefined
      })
      toast.success('Stock berhasil ditambahkan')
      setNewStockLot({
        item_id: '',
        warehouse_id: '',
        batch_no: '',
        quantity: 0,
        unit_cost: 0,
        expiry_date: '',
        supplier: '',
        notes: ''
      })
      setIsAddStockOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menambahkan stock')
    }
  }

  const removeStock = async () => {
    try {
      await inventoryAPI.removeStock({
        lot_id: parseInt(removeStockData.lot_id),
        quantity: removeStockData.quantity,
        reason: removeStockData.reason,
        reference: removeStockData.reference || undefined,
        performed_by: removeStockData.performed_by,
        notes: removeStockData.notes || undefined
      })
      toast.success('Stock berhasil dikurangi')
      setRemoveStockData({
        lot_id: '',
        quantity: 0,
        reason: '',
        reference: '',
        performed_by: user?.first_name + ' ' + user?.last_name || 'Current User',
        notes: ''
      })
      setSelectedLot(null)
      setIsRemoveStockOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengurangi stock')
    }
  }

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setNewItem({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorder_point: item.reorder_point,
      status: item.status,
      avg_cost: item.avg_cost,
      description: item.description || '',
      suppliers: item.suppliers || []
    })
    setIsEditItemOpen(true)
  }

  const openRemoveStock = (lot: StockLot) => {
    setSelectedLot(lot)
    setRemoveStockData({
      lot_id: lot.id.toString(),
      quantity: 0,
      reason: '',
      reference: '',
      performed_by: user?.first_name + ' ' + user?.last_name || 'Current User',
      notes: ''
    })
    setIsRemoveStockOpen(true)
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Seeds': 'bg-green-100 text-green-800 border-green-200',
      'Fertilizer': 'bg-amber-100 text-amber-800 border-amber-200',
      'Pesticide': 'bg-red-100 text-red-800 border-red-200',
      'Spare Parts': 'bg-blue-100 text-blue-800 border-blue-200',
      'Tools': 'bg-purple-100 text-purple-800 border-purple-200',
      'Equipment': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStockStatus = (current: number, reorder: number) => {
    if (current <= reorder) return { status: 'Low Stock', color: 'bg-red-100 text-red-800 border-red-200' }
    if (current <= reorder * 1.5) return { status: 'Warning', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    return { status: 'Good', color: 'bg-green-100 text-green-800 border-green-200' }
  }

  const getMovementTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'in': 'bg-green-100 text-green-800 border-green-200',
      'out': 'bg-red-100 text-red-800 border-red-200',
      'transfer': 'bg-blue-100 text-blue-800 border-blue-200',
      'adjustment': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
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

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory & Warehouse</h1>
          <p className="text-muted-foreground">Manage stock, warehouses, and inventory movements</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats?.total_items || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Active SKUs</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : `Rp${(stats?.stock_value || 0).toLocaleString()}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total inventory value</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Warehouses</p>
                <p className="text-2xl font-bold text-blue-600">{loading ? '...' : stats?.total_warehouses || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Active locations</p>
              </div>
              <WarehouseIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-red-600">{loading ? '...' : lowStockItems.length}</p>
                <p className="text-xs text-gray-500 mt-1">Items need reorder</p>
              </div>
              <TrendingDown className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('items')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'items'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inventory Items
              </button>
              <button
                onClick={() => setActiveTab('lots')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'lots'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Stock Lots
              </button>
              <button
                onClick={() => setActiveTab('warehouses')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'warehouses'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Warehouses
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'movements'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Movements
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Items Tab */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    <option value="Seeds">Seeds</option>
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Pesticide">Pesticide</option>
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Tools">Tools</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                  <button
                    onClick={() => setIsAddItemOpen(true)}
                    className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>

                {/* Low Stock Alert */}
                {lowStockItems.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-600">Low Stock Alert</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {lowStockItems.length} items are below reorder point and need restocking.
                    </p>
                  </div>
                )}

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item) => {
                        const totalStock = getTotalStock(item.id)
                        const stockStatus = getStockStatus(totalStock, item.reorder_point)
                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{item.sku}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="font-medium">{totalStock}</span>
                              <span className="text-gray-500 ml-1">{item.unit}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{item.reorder_point} {item.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${stockStatus.color}`}>
                                {stockStatus.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">Rp{item.avg_cost.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lots Tab */}
            {activeTab === 'lots' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search lots..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="expired">Expired</option>
                    <option value="depleted">Depleted</option>
                  </select>
                  <button
                    onClick={() => setIsAddStockOpen(true)}
                    className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Stock
                  </button>
                  <button
                    onClick={() => setIsRemoveStockOpen(true)}
                    className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Minus className="h-4 w-4" />
                    Remove Stock
                  </button>
                </div>

                {/* Stock Lots Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockLots.map((lot) => (
                        <tr key={lot.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{lot.lot_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium">{lot.item.name}</div>
                              <div className="text-sm text-gray-500">{lot.item.sku}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium">{lot.warehouse.name}</div>
                              <div className="text-sm text-gray-500">{lot.warehouse.type}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{lot.batch_no}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-medium">{lot.quantity.toLocaleString()}</span>
                            <span className="text-gray-500 ml-1">{lot.item.unit}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Rp{lot.unit_cost.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Rp{lot.total_cost.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{lot.supplier}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                              lot.status === 'available' ? 'bg-green-100 text-green-800 border-green-200' :
                              lot.status === 'reserved' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              lot.status === 'expired' ? 'bg-red-100 text-red-800 border-red-200' :
                              lot.status === 'depleted' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                              {lot.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {lot.status === 'available' && lot.quantity > 0 && (
                              <button
                                onClick={() => openRemoveStock(lot)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Warehouses Tab */}
            {activeTab === 'warehouses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search warehouses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{warehouse.name}</h3>
                          <p className="text-sm text-gray-500">{warehouse.type}</p>
                        </div>
                        <WarehouseIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      {warehouse.description && (
                        <p className="text-sm text-gray-600 mb-4">{warehouse.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">API Key</span>
                          <span className="text-sm text-gray-600 font-mono">{warehouse.apikey}</span>
                        </div>
                        {warehouse.field_ref && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Field Reference</span>
                            <span className="text-sm text-gray-600">{warehouse.field_ref}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movements Tab */}
            {activeTab === 'movements' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search movements..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <select
                    value={movementTypeFilter}
                    onChange={(e) => setMovementTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="in">IN</option>
                    <option value="out">OUT</option>
                    <option value="transfer">Transfer</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                {/* Movements Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {movements.map((movement) => (
                        <tr key={movement.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{movement.movement_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium">{movement.item.name}</div>
                              <div className="text-sm text-gray-500">{movement.item.sku}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {movement.lot ? (
                              <div>
                                <div className="text-sm font-mono">{movement.lot.lot_id}</div>
                                <div className="text-sm text-gray-500">{movement.lot.batch_no}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getMovementTypeColor(movement.type)}`}>
                              {movement.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-medium">{movement.quantity}</span>
                            <span className="text-gray-500 ml-1">{movement.item.unit}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Rp{movement.unit_cost.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">Rp{movement.total_cost.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{movement.reason}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{movement.performed_by}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(movement.created_at || '').toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Item Dialog */}
        {isAddItemOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsAddItemOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add Inventory Item</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                    <input
                      type="text"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter SKU code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Item name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      <option value="Seeds">Seeds</option>
                      <option value="Fertilizer">Fertilizer</option>
                      <option value="Pesticide">Pesticide</option>
                      <option value="Spare Parts">Spare Parts</option>
                      <option value="Tools">Tools</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                      <input
                        type="text"
                        value={newItem.unit}
                        onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="kg, piece, L, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point *</label>
                      <input
                        type="number"
                        value={newItem.reorder_point}
                        onChange={(e) => setNewItem({...newItem, reorder_point: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={newItem.status}
                        onChange={(e) => setNewItem({...newItem, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avg Cost</label>
                      <input
                        type="number"
                        value={newItem.avg_cost}
                        onChange={(e) => setNewItem({...newItem, avg_cost: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                      placeholder="Item description"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setIsAddItemOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addItem}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Dialog */}
        {isEditItemOpen && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsEditItemOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Inventory Item</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                    <input
                      type="text"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Seeds">Seeds</option>
                      <option value="Fertilizer">Fertilizer</option>
                      <option value="Pesticide">Pesticide</option>
                      <option value="Spare Parts">Spare Parts</option>
                      <option value="Tools">Tools</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                      <input
                        type="text"
                        value={newItem.unit}
                        onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point *</label>
                      <input
                        type="number"
                        value={newItem.reorder_point}
                        onChange={(e) => setNewItem({...newItem, reorder_point: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={newItem.status}
                        onChange={(e) => setNewItem({...newItem, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avg Cost</label>
                      <input
                        type="number"
                        value={newItem.avg_cost}
                        onChange={(e) => setNewItem({...newItem, avg_cost: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setIsEditItemOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editItem}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Update Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Stock Dialog */}
        {isAddStockOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsAddStockOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add Stock Lot</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                    <select
                      value={newStockLot.item_id}
                      onChange={(e) => setNewStockLot({...newStockLot, item_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                    <select
                      value={newStockLot.warehouse_id}
                      onChange={(e) => setNewStockLot({...newStockLot, warehouse_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} - {warehouse.type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch No *</label>
                    <input
                      type="text"
                      value={newStockLot.batch_no}
                      onChange={(e) => setNewStockLot({...newStockLot, batch_no: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Batch number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        value={newStockLot.quantity}
                        onChange={(e) => setNewStockLot({...newStockLot, quantity: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                      <input
                        type="number"
                        value={newStockLot.unit_cost}
                        onChange={(e) => setNewStockLot({...newStockLot, unit_cost: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                    <input
                      type="text"
                      value={newStockLot.supplier}
                      onChange={(e) => setNewStockLot({...newStockLot, supplier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={newStockLot.expiry_date}
                      onChange={(e) => setNewStockLot({...newStockLot, expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={newStockLot.notes}
                      onChange={(e) => setNewStockLot({...newStockLot, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setIsAddStockOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addStock}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove Stock Dialog */}
        {isRemoveStockOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsRemoveStockOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Remove Stock</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Lot *</label>
                    <select
                      value={removeStockData.lot_id}
                      onChange={(e) => setRemoveStockData({...removeStockData, lot_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select stock lot</option>
                      {stockLots.filter(lot => lot.status === 'available' && lot.quantity > 0).map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.lot_id} - {lot.item.name} ({lot.quantity} {lot.item.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      value={removeStockData.quantity}
                      onChange={(e) => setRemoveStockData({...removeStockData, quantity: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                    <input
                      type="text"
                      value={removeStockData.reason}
                      onChange={(e) => setRemoveStockData({...removeStockData, reason: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Reason for removal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <input
                      type="text"
                      value={removeStockData.reference}
                      onChange={(e) => setRemoveStockData({...removeStockData, reference: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Reference number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performed By *</label>
                    <input
                      type="text"
                      value={removeStockData.performed_by}
                      onChange={(e) => setRemoveStockData({...removeStockData, performed_by: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Who performed this action"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={removeStockData.notes}
                      onChange={(e) => setRemoveStockData({...removeStockData, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows={3}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setIsRemoveStockOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={removeStock}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Remove Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


