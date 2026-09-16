import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const DJANGO_PAGE_SIZE = 20
const LOW_STOCK_PAGE_SIZE = 7

function Inventory() {
  // Inventory State
  const [inventory, setInventory] = useState([])
  const [totalInventoryCount, setTotalInventoryCount] = useState(0)
  const [inventoryPage, setInventoryPage] = useState(1)

  // Search State
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Low Stock State
  const [lowStock, setLowStock] = useState([])
  const [lowStockPage, setLowStockPage] = useState(1)
  const [totalLowStockCount, setTotalLowStockCount] = useState(0)

  // Logs State
  const [logs, setLogs] = useState([])
  const [totalLogsCount, setTotalLogsCount] = useState(0)
  const [logsPage, setLogsPage] = useState(1)

  // UI State
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('add')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const { user } = useAuth()
  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.is_superuser

  const inventoryRef = useRef(null)

  useEffect(() => {
    fetchInventory(inventoryPage, searchTerm)
  }, [inventoryPage, searchTerm])

  useEffect(() => {
    if (inventoryRef.current) {
      inventoryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchTerm])

  useEffect(() => {
    fetchLogs(logsPage)
  }, [logsPage])

  useEffect(() => {
    fetchLowStock(lowStockPage)
  }, [lowStockPage])

  const fetchInventory = async (page, search = '') => {
    try {
      setLoading(true)
      const query = search ? `&search=${search}` : ''
      const res = await api.get(`/inventory/?page=${page}${query}`)

      if (res.data.results) {
        setInventory(res.data.results)
        setTotalInventoryCount(res.data.count || 0)
      } else if (Array.isArray(res.data)) {
        setInventory(res.data)
        setTotalInventoryCount(res.data.length)
      } else {
        setInventory([])
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLowStock = async (page = 1) => {
    try {
      const res = await api.get(`/inventory/low-stock/?page=${page}`)
      if (res.data.results) {
        setLowStock(res.data.results)
        setTotalLowStockCount(res.data.count || 0)
      } else {
        const data = res.data
        setLowStock(data)
        setTotalLowStockCount(data.length || 0)
      }
    } catch (error) {
      console.error('Error fetching low stock:', error)
    }
  }

  const fetchLogs = async (page) => {
    try {
      const res = await api.get(`/inventory/logs/?page=${page}`)
      if (res.data.results) {
        setLogs(res.data.results)
        setTotalLogsCount(res.data.count || 0)
      } else {
        setLogs(res.data)
        setTotalLogsCount(res.data.length || 0)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const endpoint = modalType === 'add' ? '/inventory/add/' : '/inventory/remove/'
      const pId = selectedProduct.product_id

      if (!pId) {
        alert("Error: Product ID is missing.")
        return
      }

      await api.post(endpoint, {
        product_id: pId,
        quantity: parseInt(quantity),
        notes: notes
      })

      setShowModal(false)
      setQuantity(1)
      setNotes('')

      fetchInventory(inventoryPage, searchTerm)
      setLowStockPage(1)
      fetchLowStock(1)
      setLogsPage(1)
      fetchLogs(1)

    } catch (error) {
      console.error("Submit error:", error.response?.data)
      alert(error.response?.data?.error || 'Error updating inventory')
    }
  }

  const inventoryTotalPages = Math.ceil(totalInventoryCount / DJANGO_PAGE_SIZE)
  const logsTotalPages = Math.ceil(totalLogsCount / DJANGO_PAGE_SIZE)
  const lowStockTotalPages = Math.ceil(totalLowStockCount / LOW_STOCK_PAGE_SIZE)

  if (loading && inventory.length === 0) return <div>Loading Inventory...</div>

  return (
    <div className="inventory-container">
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Inventory Management</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Monitor real-time stock levels, adjust quantities, and review audit history logs.
        </p>
      </div>

      {/* Low Stock Alert Section */}
      {lowStock.length > 0 && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Low Stock Alert ({totalLowStockCount})
            </h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Current Stock</th><th>Reorder Level</th></tr>
              </thead>
              <tbody>
                {lowStock.map(item => (
                  <tr key={item.product_id}>
                    <td><strong>{item.product_name}</strong></td>
                    <td>{item.product_sku}</td>
                    <td>
                      <span className="badge badge-warning">{item.quantity_in_stock} remaining</span>
                    </td>
                    <td>{item.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lowStockTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {lowStockPage} of {lowStockTotalPages}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={lowStockPage === 1}
                  onClick={() => setLowStockPage(p => p - 1)}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  disabled={lowStockPage === lowStockTotalPages}
                  onClick={() => setLowStockPage(p => p + 1)}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Inventory Table */}
      <div className="card" ref={inventoryRef}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h3 className="card-title">Stock Overview ({totalInventoryCount})</h3>
          <div className="search-bar" style={{ width: '280px', marginBottom: 0 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setInventoryPage(1)
                setSearchTerm(searchInput.trim())
              }}
            >
              <input
                type="text"
                placeholder="Search Name or SKU..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {inventory.length > 0 ? (
                inventory.map((item) => (
                  <tr key={item.product_id}>
                    <td><strong>{item.product_name}</strong></td>
                    <td>{item.product_sku}</td>
                    <td>{item.category_name || '-'}</td>
                    <td><strong>{item.quantity_in_stock}</strong></td>
                    <td>
                      <span className={`badge ${item.is_low_stock ? 'badge-warning' : 'badge-success'}`}>
                        {item.is_low_stock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="table-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => { setSelectedProduct(item); setModalType('add'); setQuantity(1); setShowModal(true); }}>
                          + Add
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedProduct(item); setModalType('remove'); setQuantity(1); setShowModal(true); }}>
                          - Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No items found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {inventoryTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {inventoryPage} of {inventoryTotalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled={inventoryPage === 1} onClick={() => setInventoryPage(p => p - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <button disabled={inventoryPage === inventoryTotalPages} onClick={() => setInventoryPage(p => p + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Stock History Table */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Stock History Logs</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Product</th><th>Type</th><th>Change</th><th>Prev</th><th>New</th><th>By</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td><strong>{log.product_name}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>
                    <span className={`badge ${log.change_type === 'add' ? 'badge-success' : 'badge-warning'}`}>
                      {log.change_type}
                    </span>
                  </td>
                  <td style={{ color: log.quantity_change > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </td>
                  <td>{log.previous_quantity}</td>
                  <td>{log.new_quantity}</td>
                  <td>{log.created_by_name || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No history logs recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {logsTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing {totalLogsCount} total logs</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled={logsPage === 1} onClick={() => setLogsPage(p => p - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <button disabled={logsPage === logsTotalPages} onClick={() => setLogsPage(p => p + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalType === 'add' ? 'Add Stock Quantity' : 'Reduce Stock Quantity'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p style={{ marginBottom: '8px' }}>Product: <strong>{selectedProduct?.product_name}</strong></p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Current Stock Level: <strong>{selectedProduct?.quantity_in_stock}</strong></p>
                
                <div className="form-group">
                  <label className="form-label">Quantity to {modalType}</label>
                  <input
                    type="number"
                    min="1"
                    max={modalType === 'remove' ? selectedProduct?.quantity_in_stock : undefined}
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Adjustment Reason / Notes</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide details for this stock update..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={`btn ${modalType === 'add' ? 'btn-primary' : 'btn-danger'}`}>
                  Confirm {modalType === 'add' ? 'Addition' : 'Removal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory