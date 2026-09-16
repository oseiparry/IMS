import { useState, useEffect } from 'react'
import api from '../services/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function Reports() {
  const [period, setPeriod] = useState('week')
  const [chartData, setChartData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthlySalesLog, setMonthlySalesLog] = useState([])

  useEffect(() => {
    const fetchMonthlySalesLog = async () => {
      try {
        const res = await api.get('/reports/monthly-sales-log/')
        setMonthlySalesLog(res.data)
      } catch (error) {
        console.error('Error fetching monthly sales log:', error)
      }
    }

    fetchMonthlySalesLog()
  }, [])

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [chartRes, productsRes] = await Promise.all([
        api.get(`/reports/sales-chart/?period=${period}`),
        api.get('/reports/top-products/')
      ])
      setChartData(chartRes.data)
      setTopProducts(productsRes.data)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = async () => {
    try {
      const response = await api.get('/reports/export-csv/', {
        params: { period },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url

      const contentDisposition = response.headers['content-disposition']
      let fileName = `sales_report_${new Date().toISOString().split('T')[0]}.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) fileName = match[1]
      }

      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export CSV Error:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  if (loading) return <div>Loading Reports...</div>

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Analytics & Reports</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Analyze sales performance, track profitability trends, and review product rankings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '8px 14px', fontSize: '0.88rem' }} 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          <button className="btn btn-secondary" onClick={exportCSV}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Sales Trend Line Chart Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Revenue vs. Profit Trend</h3>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="revenue" name="Revenue (GH₵)" stroke="#0d9488" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="profit" name="Profit (GH₵)" stroke="#3b82f6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table Card */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Top Selling Products (Last 30 Days)</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity Sold</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, idx) => (
                <tr key={product.product__id}>
                  <td><strong>#{idx + 1}</strong></td>
                  <td><strong>{product.product__name}</strong></td>
                  <td>{product.product__sku}</td>
                  <td>
                    <span className="badge badge-secondary" style={{ background: '#f1f5f9', color: 'var(--text-main)' }}>
                      {product.total_quantity} units
                    </span>
                  </td>
                  <td>GH₵{parseFloat(product.total_revenue).toFixed(2)}</td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                      GH₵{parseFloat(product.total_profit).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No product performance data available for this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Breakdown Bar Chart Card */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Volume Breakdown</h3>
        </div>
        <div style={{ height: '280px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="revenue" name="Revenue (GH₵)" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit (GH₵)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Sales Log Table Card */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Monthly Sales Log</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Month</th>
                <th>Total Revenue</th>
                <th>Total Profit</th>
                <th>Total Transactions</th>
                <th>Total Items Sold</th>
              </tr>
            </thead>
            <tbody>
              {monthlySalesLog.map((log) => (
                <tr key={`${log.year}-${log.month}`}>
                  <td>{log.year}</td>
                  <td>{new Date(log.year, log.month - 1).toLocaleString('default', { month: 'long' })}</td>
                  <td>GH₵{parseFloat(log.total_revenue).toFixed(2)}</td>
                  <td>GH₵{parseFloat(log.total_profit).toFixed(2)}</td>
                  <td>{log.total_transactions}</td>
                  <td>{log.total_items_sold}</td>
                </tr>
              ))}
              {monthlySalesLog.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No monthly sales log data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reports