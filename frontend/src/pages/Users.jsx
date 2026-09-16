import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { user: currentUser } = useAuth()

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.is_superuser
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.is_superuser

  const [form, setForm] = useState({
    username: '', password: '', password_confirm: '',
    first_name: '', last_name: '', role: 'staff', phone: '', address: ''
  })

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users/')
      setUsers(res.data.results || res.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatApiError = (error) => {
    const data = error.response?.data
    if (!data) return 'Error creating user'
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    return Object.entries(data)
      .map(([field, messages]) => {
        const msgs = Array.isArray(messages) ? messages.join(' ') : messages
        return `${field}: ${msgs}`
      })
      .join('\n')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.password_confirm) {
      alert('Passwords do not match')
      return
    }

    try {
      await api.post('/auth/users/', form)
      setShowModal(false)
      setForm({
        username: '', password: '', password_confirm: '',
        first_name: '', last_name: '', role: 'staff', phone: '', address: ''
      })
      fetchUsers()
    } catch (error) {
      alert(formatApiError(error))
    }
  }

  const toggleUserStatus = async (userId, isActive) => {
    if (!confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this user?`)) return
    try {
      await api.patch(`/auth/users/${userId}/`, { is_active: !isActive })
      fetchUsers()
    } catch (error) {
      alert('Error updating user status')
    }
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  if (loading) return <div>Loading Users...</div>

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>User Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Manage team accounts, assign system roles, and configure access credentials.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="17" y1="11" x2="23" y2="11"></line>
          </svg>
          Add User
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Registered Accounts ({users.length})</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Phone</th>
                <th>System Role</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
{/* Replace the table body mapping inside Users.jsx */}
            <tbody>
              {users
                .filter((u) => u.id !== currentUser?.id) // Excludes the currently logged-in user
                .map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '-'}</td>
                    <td>{u.phone || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span className="badge badge-secondary" style={{ background: '#f1f5f9', color: 'var(--text-main)' }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-warning'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => toggleUserStatus(u.id, u.is_active)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      {isSuperAdmin && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const wantedPwd = window.prompt(
                              `Enter new password for account "${u.username}"`
                            );
                            if (wantedPwd === null) return;

                            if (wantedPwd.trim().length < 8) {
                              alert('Password should be at least 8 characters long');
                              return;
                            }

                            api
                              .post(`/auth/users/${u.id}/set-password/`, {
                                new_password: wantedPwd,
                              })
                              .then(() => {
                                alert(`Password for ${u.username} updated successfully`);
                                fetchUsers();
                              })
                              .catch((e) => {
                                const msg =
                                  e.response?.data?.detail ||
                                  e.response?.data?.join?.(' ') ||
                                  'Error setting password';
                                alert(msg);
                              });
                          }}
                        >
                          Reset Password
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {users.filter((u) => u.id !== currentUser?.id).length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No other system user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Account</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={form.password_confirm}
                      onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                      required
                      style={form.password_confirm && form.password !== form.password_confirm
                        ? { borderColor: 'var(--danger)' }
                        : {}}
                    />
                    {form.password_confirm && form.password !== form.password_confirm && (
                      <small style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        Passwords do not match
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users