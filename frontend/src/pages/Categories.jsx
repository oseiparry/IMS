import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const { user } = useAuth()

  const [form, setForm] = useState({
    name: '', description: ''
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories/')
      setCategories(res.data.results || res.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCategory) {
        await api.put(`/products/categories/${editingCategory.id}/`, form)
      } else {
        await api.post('/products/categories/', form)
      }
      setShowModal(false)
      setEditingCategory(null)
      setForm({ name: '', description: '' })
      fetchCategories()
    } catch (error) {
      alert(error.response?.data?.detail || 'Error saving category')
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      description: category.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await api.delete(`/products/categories/${id}/`)
      fetchCategories()
    } catch (error) {
      alert('Error deleting category')
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Categories Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Organize products into structured categories for cataloging and inventory.
          </p>
        </div>

        {user?.is_admin_user && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingCategory(null)
              setForm({ name: '', description: '' })
              setShowModal(true)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Category
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">All Categories ({categories.length})</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Products Count</th>
                {user?.is_admin_user && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={user?.is_admin_user ? 4 : 3} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td style={{ color: category.description ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {category.description || '-'}
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ background: '#f1f5f9', color: 'var(--text-main)' }}>
                        {category.products_count || 0} Products
                      </span>
                    </td>
                    {user?.is_admin_user && (
                      <td className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(category)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(category.id)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={user?.is_admin_user ? 4 : 3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Beverages, Pharmaceuticals..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional category description..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories