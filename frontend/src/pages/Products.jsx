import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// Custom hook to debounce search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

function Products() {
  const { user } = useAuth()

  // Only super_admin (or is_superuser) can manage products
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_superuser

  // Table column count changes when Actions column is hidden
  const tableColSpan = isSuperAdmin ? 7 : 6

  // Data State
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Pagination & Search State
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const debouncedSearch = useDebounce(search, 500)

  // UI State
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    cost_price: '',
    selling_price: '',
    quantity_in_stock: '',
    reorder_level: 10
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/products/`, {
        params: {
          search: debouncedSearch,
          page: page
        }
      })
      setProducts(res.data.results || [])
      setTotalCount(res.data.count || 0)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories/')
      setCategories(res.data.results || res.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isSuperAdmin) return

    try {
      const data = {
        ...form,
        cost_price: parseFloat(form.cost_price),
        selling_price: parseFloat(form.selling_price),
        quantity_in_stock: parseInt(form.quantity_in_stock),
        reorder_level: parseInt(form.reorder_level),
        category: form.category || null
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}/`, data)
      } else {
        await api.post('/products/', data)
      }

      setShowModal(false)
      fetchProducts()
    } catch (error) {
      alert(error.response?.data?.detail || 'Error saving product')
    }
  }

  const handleDelete = async (id) => {
    if (!isSuperAdmin) return

    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await api.delete(`/products/${id}/`)
      fetchProducts()
    } catch (error) {
      alert('Error deleting product')
    }
  }

  const openModal = (product = null) => {
    if (!isSuperAdmin) return

    if (product) {
      setEditingProduct(product)
      setForm({
        name: product.name,
        sku: product.sku,
        category: product.category || '',
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        quantity_in_stock: product.quantity_in_stock,
        reorder_level: product.reorder_level
      })
    } else {
      setEditingProduct(null)
      setForm({
        name: '',
        sku: '',
        category: '',
        cost_price: '',
        selling_price: '',
        quantity_in_stock: '',
        reorder_level: 10
      })
    }
    setShowModal(true)
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div>
      {/* Page Title & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Products Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Manage product inventory, pricing, stock levels, and categories.
          </p>
        </div>

        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => openModal()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Product
          </button>
        )}
      </div>

      {/* Main Content Card */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h3 className="card-title">All Products ({totalCount})</h3>
          
          <div className="search-bar" style={{ width: '280px', marginBottom: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by name, SKU, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Stock</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableColSpan} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.sku}</strong></td>
                    <td>{product.name}</td>
                    <td>{product.category_name || '-'}</td>
                    <td>GH₵{parseFloat(product.cost_price).toFixed(2)}</td>
                    <td>GH₵{parseFloat(product.selling_price).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${product.quantity_in_stock <= product.reorder_level ? 'badge-warning' : 'badge-success'}`}>
                        {product.quantity_in_stock} in stock
                      </span>
                    </td>

                    {isSuperAdmin && (
                      <td className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openModal(product)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product.id)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableColSpan} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter product title..."
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">SKU Code</label>
                    <input
                      className="form-input"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="e.g. PRD-001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Cost Price (GH₵)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (GH₵)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={form.selling_price}
                      onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.quantity_in_stock}
                      onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Alert Level</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.reorder_level}
                      onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products