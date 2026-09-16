import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  const isStaff = user?.role === 'staff'
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.is_superuser
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_superuser

  useEffect(() => {
    fetchDashboardBase()
    fetchRecentSales()
  }, [])

  const fetchDashboardBase = async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        api.get('/reports/dashboard/'),
        api.get('/reports/sales-chart/?period=week')
      ])
      setStats(statsRes.data)
      setChartData(chartRes.data)

      if (isAdmin) {
        const lowStockRes = await api.get('/inventory/low-stock/')
        setLowStock(lowStockRes.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard base:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentSales = async () => {
    try {
      const res = await api.get('/reports/recent-sales/')
      setRecentSales(res.data || [])
    } catch (error) {
      console.error('Error fetching recent sales:', error)
    }
  }

  // Helper component for summary sections (Yesterday, Week, Month)
  const SummarySection = ({ title, data }) => (
    <div className="card mt-4">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Revenue</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>GH₵{data?.revenue?.toFixed(2) || '0.00'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Profit</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>GH₵{data?.profit?.toFixed(2) || '0.00'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Transactions</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{data?.transactions || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Items Sold</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{data?.items_sold || 0}</div>
        </div>
      </div>
    </div>
  )

  if (loading) return <div>Loading dashboard...</div>

  // --- STAFF VIEW ---
  if (isStaff) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Welcome Back,</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>POS Operations</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Today's Revenue</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '4px 0' }}>GH₵{stats?.today?.revenue?.toFixed(2) || '0.00'}</div>
          </div>
          
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Today's Sales</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '4px 0' }}>{stats?.today?.transactions || 0}</div>
          </div>

          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={() => navigate('/pos')}>
              Open POS Register →
            </button>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-header">
            <h3 className="card-title">Recent Sales</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id || sale.sale_id}>
                    <td><strong>#{sale.sale_id || sale.id}</strong></td>
                    <td>GH₵{parseFloat(sale.total_amount).toFixed(2)}</td>
                    <td>{sale.items_count}</td>
                    <td>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // --- ADMIN / SUPERADMIN VIEW ---
  return (
    <div>
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Welcome Back,</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Inventory & POS Management</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Track your sales, manage inventory, and keep your business running smoothly.</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '16px' }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/pos')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            New Sale (POS) →
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/products')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            Manage Products ›
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/inventory')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            Manage Inventory›
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/sales')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            View Sales ›
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Reports ›
          </button>
        
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Today's Revenue</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '4px 0' }}>
            GH₵{stats?.today?.revenue?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>↑ Today's totals</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Today's Profit</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '4px 0' }}>
            GH₵{stats?.today?.profit?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>↑ Today's totals</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Products Sold Today</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '4px 0' }}>
            {stats?.today?.items_sold || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>↑ Today's totals</div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Low Stock Items</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '4px 0', color: 'var(--danger)' }}>
            {stats?.low_stock_count || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Needs attention</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Low Stock Alert
            </h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 5).map((item) => (
                  <tr key={item.product_id}>
                    <td><strong>{item.product_name}</strong></td>
                    <td>{item.product_sku}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: '600' }}>{item.quantity_in_stock}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/inventory')}>Add Stock</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Grid: Weekly Trend & Recent Sales */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Weekly Sales Trend</h3>
            <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}>
              <option>This Week</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Sales</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/sales')} style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--primary-teal)' }}>View All →</button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Total</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id || sale.sale_id}>
                    <td><strong>#{sale.sale_id || sale.id}</strong></td>
                    <td>GH₵{parseFloat(sale.total_amount).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td><span className="badge badge-success">Completed</span></td>
                  </tr>
                ))}
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No recent sales.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historical Summaries */}
      <SummarySection title="Yesterday's Summary" data={stats?.yesterday} />
      <SummarySection title="Weekly Summary" data={stats?.week} />
      
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Monthly Summary</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Month Revenue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>GH₵{stats?.month?.revenue?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Month Profit</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>GH₵{stats?.month?.profit?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Products</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats?.total_products || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Low Stock Base</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--warning)' }}>{stats?.low_stock_count || 0}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard