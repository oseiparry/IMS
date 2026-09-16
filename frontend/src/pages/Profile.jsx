import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

function Profile() {
  const { user } = useAuth()

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || ''
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Password Visibility Toggles
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Floating Toast State
  const [toast, setToast] = useState(null) // { type: 'success' | 'danger', text: '' }

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast = (type, text) => {
    setToast({ type, text })
  }

  // 1. Handle Profile / Personal Details Update
  const handleProfileUpdate = async (e) => {
    e.preventDefault()

    if (!profileForm.username.trim()) {
      showToast('danger', 'Username cannot be left empty.')
      return
    }

    setProfileLoading(true)
    try {
      await api.patch(`/auth/users/${user.id}/`, {
        username: profileForm.username.trim(),
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim()
      })
      showToast('success', 'Profile details updated successfully!')
    } catch (error) {
      const errMsg = error.response?.data?.username?.[0] || 
                     error.response?.data?.detail || 
                     'Failed to update profile details.'
      showToast('danger', errMsg)
    } finally {
      setProfileLoading(false)
    }
  }

  // 2. Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast('danger', 'New passwords do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      await api.post('/auth/change-password/', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      })
      showToast('success', 'Password updated successfully!')
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (error) {
      const errMsg = error.response?.data?.old_password?.[0] || 
                     error.response?.data?.new_password?.[0] || 
                     error.response?.data?.detail || 
                     'Failed to update password.'
      showToast('danger', errMsg)
    } finally {
      setPasswordLoading(false)
    }
  }

  const userInitials = user?.first_name 
    ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}`.toUpperCase()
    : (user?.username?.[0] || 'U').toUpperCase()

  return (
    <div>
      {/* Floating Top-Right Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <ToastIcon type={toast.type} />
            <span>{toast.text}</span>
            <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
          </div>
        </div>
      )}

      {/* Header Title Section */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
          Profile Details
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Manage your account credentials, username, and security settings.
        </p>
      </div>

      {/* Two-Column Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Personal Profile & Details Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ textAlign: 'center', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', margin: '0 auto 16px', background: '#0f172a', color: '#ffffff' }}>
              {userInitials}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              {user?.username}
            </h2>
            <span className="badge badge-secondary" style={{ textTransform: 'capitalize', padding: '4px 12px', fontSize: '0.8rem' }}>
              {user?.role?.replace('_', ' ') || 'Staff'}
            </span>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                placeholder="Enter username..."
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  placeholder="First name..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  placeholder="Last name..."
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="Phone number..."
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={profileLoading} 
              style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}
            >
              {profileLoading ? 'Saving Profile...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Password & Security Settings Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="card-title">Change Password</h3>
          </div>

          <form onSubmit={handlePasswordChange}>
            {/* Current Password Field */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  className="form-input"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  placeholder="Enter current password..."
                  style={{ paddingRight: '44px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(prev => !prev)}
                  style={toggleButtonStyle}
                  aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon show={showOldPassword} />
                </button>
              </div>
            </div>

            {/* New Password & Confirm Password Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-input"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Enter new password..."
                    style={{ paddingRight: '44px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    style={toggleButtonStyle}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon show={showNewPassword} />
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    placeholder="Re-enter new password..."
                    style={{ paddingRight: '44px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    style={toggleButtonStyle}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon show={showConfirmPassword} />
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={passwordLoading} 
              style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

function ToastIcon({ type }) {
  return type === 'success' ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  )
}

function EyeIcon({ show }) {
  return show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

const toggleButtonStyle = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--text-muted)'
}

export default Profile