import { useState, useEffect } from 'react'
import api from '../services/api'

// Matches the default pagination in your Django settings.py
const SALES_PAGE_SIZE = 20

function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Reset to page 1 whenever date filters change to avoid empty results
  useEffect(() => {
    setPage(1)
  }, [startDate, endDate])

  // Re-fetch sales whenever filters OR the page number changes
  useEffect(() => {
    fetchSales()
  }, [startDate, endDate, page])

  const fetchSales = async () => {
    setLoading(true)
    try {
      let url = `/sales/?page=${page}`
      if (startDate) url += `&start_date=${startDate}`
      if (endDate) url += `&end_date=${endDate}`

      const res = await api.get(url)
      setSales(res.data.results || [])
      setTotalCount(res.data.count || 0)
    } catch (error) {
      console.error('Error fetching sales:', error)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const viewReceipt = async (saleId) => {
    try {
      const res = await api.get(`/sales/receipt/${saleId}/`)
      setSelectedSale(res.data)
    } catch (error) {
      alert('Error fetching receipt')
    }
  }

  const exportCSV = async () => {
    try {
      let url = '/reports/export-csv/'
      const params = []
      if (startDate) params.push(`start_date=${startDate}`)
      if (endDate) params.push(`end_date=${endDate}`)
      if (params.length) url += '?' + params.join('&')

      const response = await api.get(url, { responseType: 'blob' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(new Blob([response.data]))
      link.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (error) {
      alert('Error exporting CSV')
    }
  }

  const totalPages = Math.ceil(totalCount / SALES_PAGE_SIZE)

  if (loading && sales.length === 0) return <div>Loading Sales History...</div>

  return (
    <div>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Sales History</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Filter completed orders, review customer receipts, and export transaction data.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={exportCSV}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Date Filter Bar */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <h3 className="card-title">Completed Transactions ({totalCount})</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="date" 
                className="form-input" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>to</span>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="date" 
                className="form-input" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Date & Time</th>
                <th>Items Count</th>
                <th>Total Amount</th>
                <th>Profit</th>
                <th>Payment Method</th>
                <th>Cashier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td><strong>#{sale.sale_id}</strong></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td>{sale.items?.length || 0}</td>
                  <td>GH₵{parseFloat(sale.total_amount).toFixed(2)}</td>
                  <td>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                      GH₵{parseFloat(sale.total_profit).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    <span className="badge badge-secondary" style={{ background: '#f1f5f9', color: 'var(--text-main)' }}>
                      {sale.payment_method}
                    </span>
                  </td>
                  <td>{sale.cashier_name || '-'}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => viewReceipt(sale.sale_id)}>
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No sales records found matching selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', marginTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {(page - 1) * SALES_PAGE_SIZE + 1}–{Math.min(page * SALES_PAGE_SIZE, totalCount)} of {totalCount} sales
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                .map((p, idx, arr) => (
                  <div key={p} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {idx > 0 && arr[idx-1] !== p - 1 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                    <button
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </div>
                ))}

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt View Modal */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Receipt - #{selectedSale.sale_id}</h3>
              <button className="modal-close" onClick={() => setSelectedSale(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>SMH WELFARE</h2>
                <p style={{ color: 'var(--text-muted)' }}>Transaction Copy</p>
              </div>

              <p><strong>Date:</strong> {new Date(selectedSale.created_at).toLocaleString()}</p>
              <p><strong>Cashier:</strong> {selectedSale.cashier_name}</p>
              
              <div style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px', margin: '12px 0' }}>
                {selectedSale.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>GH₵{parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>TOTAL</span>
                <span>GH₵{parseFloat(selectedSale.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span>Cash Received</span>
                <span>GH₵{parseFloat(selectedSale.cash_received || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Change Given</span>
                <span>GH₵{parseFloat(selectedSale.change_given || 0).toFixed(2)}</span>
              </div>
              <p style={{ marginTop: '16px', fontSize: '0.8rem', textAlign: 'center', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Payment Method: {selectedSale.payment_method}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedSale(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales