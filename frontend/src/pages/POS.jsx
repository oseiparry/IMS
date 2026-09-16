import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

function POS() {
  const [cashReceived, setCashReceived] = useState('')
  const [allProducts, setAllProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const skuInputRef = useRef(null)
  const receiptRef = useRef(null)

  const productsMap = useRef({})

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/products/')
      const data = res.data.results || res.data
      const inStock = data.filter(p => p.quantity_in_stock > 0)
      setAllProducts(inStock)
      setFilteredProducts(inStock)
      productsMap.current = Object.fromEntries(inStock.map(p => [p.id, p]))
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearchChange = async (query) => {
    setSearch(query)

    if (query.length < 2) {
      setFilteredProducts(allProducts)
      return
    }

    try {
      const res = await api.get(`/products/search/?q=${query}`)
      setFilteredProducts(res.data.filter(p => p.quantity_in_stock > 0))
    } catch (error) {
      console.error('Error searching products:', error)
    }
  }

  const handleSkuSubmit = async (e) => {
    e.preventDefault()
    if (!skuInput.trim()) return
    try {
      const res = await api.get(`/products/sku/${skuInput}/`)
      addToCart(res.data)
      setSkuInput('')
      skuInputRef.current?.focus()
    } catch {
      alert('Product not found')
    }
  }

  const addToCart = (product) => {
    const liveStock = productsMap.current[product.id]?.quantity_in_stock
                      ?? product.quantity_in_stock

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= liveStock) {
          alert('Insufficient stock')
          return prev
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: parseFloat(product.selling_price),
        quantity: 1,
      }]
    })
  }

  const updateQuantity = (productId, delta) => {
    const liveStock = productsMap.current[productId]?.quantity_in_stock ?? Infinity

    setCart(prev => {
      const item = prev.find(i => i.product_id === productId)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty < 1) return prev.filter(i => i.product_id !== productId)
      if (newQty > liveStock) {
        alert('Insufficient stock')
        return prev
      }
      return prev.map(i =>
        i.product_id === productId ? { ...i, quantity: newQty } : i
      )
    })
  }

  const removeFromCart = (productId) =>
    setCart(prev => prev.filter(i => i.product_id !== productId))

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleCheckout = async (paymentMethod) => {
    if (cart.length === 0) return

    if (paymentMethod === 'cash') {
      const cash = parseFloat(cashReceived)
      if (!cashReceived || isNaN(cash) || cash < cartTotal) {
        alert('Cash received must be a valid number greater than or equal to the total')
        return
      }
    }

    setProcessing(true)
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      const res = await api.post('/sales/create/', {
        items,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
      })

      const saleId = res.data.sale_id
      const receiptRes = await api.get(`/sales/receipt/${saleId}/`)
      setLastSale(receiptRes.data)
      setShowReceipt(true)
      setCart([])
      setCashReceived('')
      fetchProducts()
    } catch (error) {
      alert(error.response?.data?.error || 'Error processing sale')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    if (!receiptRef.current) return
    const printWindow = window.open('', '', 'height=600,width=400')
    if (!printWindow) {
      alert('Popup blocked — please allow popups for this site to print receipts.')
      return
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>body { font-family: monospace; padding: 20px; }</style>
        </head>
        <body>${receiptRef.current.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onafterprint = () => printWindow.close()
    printWindow.print()
  }

  if (loading) return <div>Loading POS terminal...</div>

  return (
    <div>
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Point of Sale Terminal</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Scan products, manage checkout cart, and generate sale receipts.</p>
      </div>

      <div className="pos-layout">
        {/* Product Catalog Column */}
        <div className="pos-products-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>


            <div className="search-bar" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Search products by name..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>

          <div className="pos-products">
            {filteredProducts.map(p => (
              <div key={p.id} className="product-card" onClick={() => addToCart(p)}>
                <div className="product-card-name">{p.name}</div>
                <div className="product-card-sku">{p.sku}</div>
                <div className="product-card-price">GH₵{parseFloat(p.selling_price).toFixed(2)}</div>
                <div className="product-card-stock" style={{ marginTop: '4px' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    {p.quantity_in_stock} in stock
                  </span>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '40px' }}>
                <p>No available in-stock products found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Cart Column */}
        <div className="pos-cart">
          <div className="cart-header">
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Checkout Cart ({cart.length})</h3>
          </div>

          <div className="cart-items">
            {cart.map(item => (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <span>GH₵{item.price.toFixed(2)} each</span>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQuantity(item.product_id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_id, 1)}>+</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(item.product_id)} style={{ padding: '2px 8px', marginLeft: '4px' }}>
                    ✕
                  </button>
                </div>
                <div style={{ textAlign: 'right', minWidth: '70px' }}>
                  <strong>GH₵{(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="empty-state" style={{ padding: '40px 10px' }}>
                <p style={{ fontSize: '0.85rem' }}>Select products on the left to add to checkout cart.</p>
              </div>
            )}
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Total Amount</span>
              <span style={{ fontSize: '1.4rem', color: 'var(--primary-teal)' }}>GH₵{cartTotal.toFixed(2)}</span>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <input
                type="number"
                className="form-input"
                placeholder="Cash Received (GH₵)"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
            </div>
            <div className="cart-actions">
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                onClick={() => handleCheckout('cash')}
                disabled={cart.length === 0 || processing}
              >
                {processing ? 'Processing Order...' : 'Complete Cash Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h3>Sale Receipt</h3>
              <button className="modal-close" onClick={() => setShowReceipt(false)}>&times;</button>
            </div>
            <div ref={receiptRef} className="modal-body" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>SMH WELFARE</h2>
                <p style={{ color: 'var(--text-muted)' }}>Transaction Receipt</p>
              </div>
              <p><strong>Sale ID:</strong> {lastSale.sale_id}</p>
              <p><strong>Date:</strong> {new Date(lastSale.created_at).toLocaleString()}</p>
              <p><strong>Cashier:</strong> {lastSale.cashier_name}</p>
              
              <div style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px', margin: '12px 0' }}>
                {lastSale.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>GH₵{parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span>TOTAL</span>
                <span>GH₵{parseFloat(lastSale.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span>Cash Received</span>
                <span>GH₵{parseFloat(lastSale.cash_received || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Change Due</span>
                <span>GH₵{parseFloat(lastSale.change_given || 0).toFixed(2)}</span>
              </div>
              <p style={{ marginTop: '16px', fontSize: '0.8rem', textAlign: 'center', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Payment Method: {lastSale.payment_method}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handlePrint}>Print Receipt</button>
              <button className="btn btn-primary" onClick={() => setShowReceipt(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POS