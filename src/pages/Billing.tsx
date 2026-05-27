import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, isMockMode } from '../services/supabase';
import type { InventoryItem, Invoice, InvoiceItem } from '../types/database';
import { Search, ShoppingBag, Plus, Minus, Trash, CheckCircle, RefreshCcw, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

export const BillingPage = () => {
  const { user, tenant, currentShop } = useAuth();
  const [activeTab, setActiveTab] = useState<'checkout' | 'returns'>('checkout');

  // Checkout State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(8.0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any | null>(null);

  // Returns State
  const [searchInvoiceToken, setSearchInvoiceToken] = useState('');
  const [invoiceLookupResult, setInvoiceLookupResult] = useState<Invoice | null>(null);
  const [invoiceItemsList, setInvoiceItemsList] = useState<any[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<{ [itemId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Damaged/Defective product');
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  // Load Inventory for Active Branch
  const loadInventory = async () => {
    if (!currentShop) return;
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', currentShop.id);
      if (data) setInventory(data);
    } catch (e) {
      console.error('Failed to load inventory:', e);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [currentShop]);

  // POS CART ACTIONS
  const addToCart = (product: InventoryItem) => {
    const existing = cart.find(c => c.item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        alert('Insufficient stock remaining on this branch!');
        return;
      }
      setCart(cart.map(c => c.item.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (product.quantity <= 0) {
        alert('Item is completely out of stock!');
        return;
      }
      setCart([...cart, { item: product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    const existing = cart.find(c => c.item.id === productId);
    if (!existing) return;
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.item.id !== productId));
    } else {
      if (delta > 0 && newQty > existing.item.quantity) {
        alert('Insufficient stock remaining on this branch!');
        return;
      }
      setCart(cart.map(c => c.item.id === productId ? { ...c, quantity: newQty } : c));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.item.id !== productId));
  };

  // CALCULATIONS
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.item.selling_price * curr.quantity), 0);
  const taxAmount = (cartSubtotal * taxPercent) / 100;
  const cartTotal = Math.max(0, cartSubtotal + taxAmount - discountAmount);

  // CHECKOUT PROCESS
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      // 1. Create or Find Customer
      let customerId: string | null = null;
      if (customerName && customerPhone) {
        const { data: existCust } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .single();

        if (existCust) {
          customerId = existCust.id;
        } else {
          const { data: newCust } = await supabase
            .from('customers')
            .insert({
              tenant_id: tenant?.id,
              name: customerName,
              phone: customerPhone
            })
            .select()
            .single();
          if (newCust) customerId = newCust.id;
        }
      }

      // 2. Create Invoice
      const invoiceToken = Math.random().toString(36).substr(2, 12);
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;

      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenant?.id,
          shop_id: currentShop?.id,
          customer_id: customerId,
          invoice_number: invoiceNumber,
          total_amount: cartTotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          payment_method: paymentMethod,
          status: 'paid',
          created_by: user?.id,
          token: invoiceToken
        })
        .select()
        .single();

      if (invErr || !invoice) throw invErr || new Error('Invoice insert failed');

      // 3. Create items and deduct quantities
      for (const cartItem of cart) {
        await supabase.from('invoice_items').insert({
          tenant_id: tenant?.id,
          invoice_id: invoice.id,
          inventory_id: cartItem.item.id,
          quantity: cartItem.quantity,
          unit_price: cartItem.item.selling_price,
          total_price: cartItem.item.selling_price * cartItem.quantity
        });

        // Deduct Inventory Stock
        await supabase
          .from('inventory')
          .update({ quantity: Math.max(0, cartItem.item.quantity - cartItem.quantity) })
          .eq('id', cartItem.item.id);
      }

      setCheckoutSuccess({
        invoice,
        itemsCount: cart.length,
        total: cartTotal,
        invoiceNumber,
        token: invoiceToken
      });

      // Clear Cart
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscountAmount(0);
      loadInventory();
    } catch (e) {
      console.error(e);
      alert('Checkout failed due to a database exception.');
    } finally {
      setIsProcessing(false);
    }
  };

  // INVOICE LOOKUP FOR RETURNS
  const handleInvoiceLookup = async () => {
    if (!searchInvoiceToken) return;
    try {
      const { data: invoiceData, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('token', searchInvoiceToken)
        .single();

      if (invErr || !invoiceData) {
        alert('Invoice not found! Check your invoice security token.');
        return;
      }

      setInvoiceLookupResult(invoiceData);

      // Get Invoice Items and details
      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceData.id);

      if (items) {
        setInvoiceItemsList(items);
        const qtys: any = {};
        items.forEach((it: any) => {
          qtys[it.id] = 0; // Default return count is 0
        });
        setReturnQuantities(qtys);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // PROCESS SALES RETURN
  const handleSalesReturn = async () => {
    if (!invoiceLookupResult) return;
    
    const itemsToReturn = Object.entries(returnQuantities).filter(([_, qty]) => qty > 0);
    if (itemsToReturn.length === 0) {
      alert('Please specify at least 1 item count to return.');
      return;
    }

    setIsProcessingReturn(true);
    try {
      let refundTotal = 0;
      
      for (const [invoiceItemId, returnQty] of itemsToReturn) {
        const itemLine = invoiceItemsList.find(it => it.id === invoiceItemId);
        if (!itemLine) continue;

        // Fetch corresponding inventory details
        const { data: invItem } = await supabase
          .from('inventory')
          .select('*')
          .eq('id', itemLine.inventory_id)
          .single();

        if (invItem) {
          // Increment stock back
          await supabase
            .from('inventory')
            .update({ quantity: invItem.quantity + returnQty })
            .eq('id', invItem.id);
        }

        refundTotal += itemLine.unit_price * returnQty;
      }

      // Record Sales Return entry
      await supabase.from('sales_returns').insert({
        tenant_id: tenant?.id,
        invoice_id: invoiceLookupResult.id,
        returned_by: user?.id,
        refund_amount: refundTotal,
        reason: returnReason
      });

      // Update Invoice Status to returned if all refunded
      await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoiceLookupResult.id);

      setReturnSuccess(`Refund of $${refundTotal.toFixed(2)} processed and stock replenished successfully!`);
      setInvoiceLookupResult(null);
      setInvoiceItemsList([]);
      setReturnQuantities({});
      setSearchInvoiceToken('');
      loadInventory();
    } catch (e) {
      console.error(e);
      alert('Return failed to log.');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  // EXCEL EXPORT SCRIPT
  const handleExportCSV = () => {
    if (inventory.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SKU,Barcode,Name,Buying Price,Selling Price,Stock Quantity,Min Stock Alert\r\n';

    inventory.forEach(item => {
      csvContent += `"${item.sku || ''}","${item.barcode || ''}","${item.name}",${item.buying_price},${item.selling_price},${item.quantity},${item.min_quantity_alert}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Outlet_${currentShop?.name || 'Shop'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.barcode && item.barcode.includes(searchQuery))
  );
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header and Toggle */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient">Billing & POS Checkout</h1>
          <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Outlet: <strong className="text-gradient-blue">{currentShop?.name || 'Loading branch...'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${activeTab === 'checkout' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('checkout')}>
            <ShoppingBag size={18} /> Point of Sale
          </button>
          <button className={`btn ${activeTab === 'returns' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setActiveTab('returns')}>
            <ArrowLeftRight size={18} /> Sales Returns
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FileSpreadsheet size={18} /> Export Inventory
          </button>
        </div>
      </div>

      {activeTab === 'checkout' ? (
        /* ==================== POS CHECKOUT TAB ==================== */
        <div className="pos-grid" style={{ flex: 1, minHeight: 0 }}>
          {/* Products Search & List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Search size={18} className="text-muted" />
              <input
                type="text"
                className="form-input"
                placeholder="Scan Barcode or search Product Name / SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', flex: 1, padding: 0, boxShadow: 'none' }}
              />
            </div>

            <div className="pos-items-scroll">
              {filteredInventory.map(item => {
                const isLow = item.quantity <= item.min_quantity_alert;
                return (
                  <div key={item.id} className="glass-panel product-card" onClick={() => addToCart(item)} style={{
                    borderColor: isLow ? 'var(--danger-border)' : 'var(--panel-border)'
                  }}>
                    <div>
                      <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                        {item.quantity <= 0 ? 'Out of Stock' : `Stock: ${item.quantity}`}
                      </span>
                      <h3 style={{ marginTop: '0.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</h3>
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>SKU: <code>{item.sku || 'N/A'}</code></p>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>${item.selling_price.toFixed(2)}</span>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '6px' }}><Plus size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Sidebar Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.25rem', padding: '1.5rem', background: '#ffffff' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Cart</h2>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{cart.length} unique lines</span>
            </div>

            {/* Cart Items Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.9rem' }}>POS Cart is currently empty.</p>
                </div>
              ) : (
                cart.map(c => (
                  <div key={c.item.id} className="flex-between" style={{ 
                    gap: '0.5rem',
                    background: '#f8fafc',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.item.name}</h4>
                      <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>${c.item.selling_price.toFixed(2)} ea</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <button className="btn btn-secondary" style={{ padding: '0.2rem', borderRadius: '4px', boxShadow: 'none' }} onClick={() => updateCartQty(c.item.id, -1)}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, width: '24px', textAlign: 'center', color: 'var(--text-primary)' }}>{c.quantity}</span>
                      <button className="btn btn-secondary" style={{ padding: '0.2rem', borderRadius: '4px', boxShadow: 'none' }} onClick={() => updateCartQty(c.item.id, 1)}>
                        <Plus size={12} />
                      </button>
                      <button className="btn btn-ghost text-danger" style={{ padding: '0.2rem' }} onClick={() => removeFromCart(c.item.id)}>
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer & Checkout controls */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                <span className="text-secondary">Subtotal</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                <span className="text-secondary">Tax ({taxPercent}%)</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex-between" style={{ gap: '0.5rem', fontSize: '0.875rem' }}>
                <span className="text-secondary">Discount ($)</span>
                <input
                  type="number"
                  className="form-input"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  style={{ width: '80px', padding: '0.25rem 0.5rem', textAlign: 'right' }}
                />
              </div>

              <div className="flex-between" style={{ fontSize: '1.25rem', fontWeight: 800, borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span>Total Due</span>
                <span className="text-gradient-blue">${cartTotal.toFixed(2)}</span>
              </div>

              {/* Customer Link (Streamlined) */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="form-label" style={{ fontSize: '0.65rem' }}>Customer Ledger Mapping</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Full Name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>
              </div>

              {/* Payment selector */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label" style={{ fontSize: '0.65rem' }}>Payment Method</span>
                <select className="form-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <option value="cash">Cash Tendered</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="upi">UPI / Instant QR Scan</option>
                  <option value="credit">Customer Credit Ledger</option>
                </select>
              </div>

              <button className="btn btn-primary w-full" onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} style={{ padding: '0.85rem', marginTop: '0.25rem' }}>
                {isProcessing ? 'Processing Transaction...' : `Finalize & Checkout ($${cartTotal.toFixed(2)})`}
              </button>
            </div>
          </div>

          {/* Checkout Success Modal Overlay */}
          {checkoutSuccess && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div className="glass-panel animate-fade-in" style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', border: '1px solid var(--success-border)', background: '#ffffff', boxShadow: 'var(--shadow-xl)' }}>
                <div style={{
                  background: 'var(--success-bg)',
                  color: 'var(--success)',
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <CheckCircle size={32} />
                </div>
                <div>
                  <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>Checkout Successful!</h2>
                  <p className="text-secondary" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>Invoice Receipt: <code>{checkoutSuccess.invoiceNumber}</code></p>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', fontSize: '0.875rem', border: '1px solid rgba(0,0,0,0.02)' }}>
                  <div className="flex-between"><span>Payment Method:</span><strong style={{ textTransform: 'uppercase', color: 'var(--text-primary)' }}>{checkoutSuccess.invoice.payment_method}</strong></div>
                  <div className="flex-between"><span>Amount Received:</span><strong className="text-success">${checkoutSuccess.total.toFixed(2)}</strong></div>
                  <div className="flex-between"><span>Security Token:</span><code>{checkoutSuccess.token}</code></div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a href={`/invoice/${checkoutSuccess.token}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full" style={{ textDecoration: 'none' }}>
                    View & Print Invoice Ledger
                  </a>
                  <button className="btn btn-primary w-full" onClick={() => setCheckoutSuccess(null)}>Done & Clear Cart</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==================== SALES RETURNS TAB ==================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem' }}>Look up Invoice for Refund/Restock</h2>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Search using the dynamic secure token generated on the checkout invoice sheet.</p>
            
            {returnSuccess && <div className="badge badge-success w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}>{returnSuccess}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. d7aE8c2B9F4a"
                value={searchInvoiceToken}
                onChange={e => setSearchInvoiceToken(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleInvoiceLookup}>Lookup Invoice</button>
            </div>
          </div>

          {invoiceLookupResult && (
            <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Invoice: {invoiceLookupResult.invoice_number}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.825rem', marginTop: '0.15rem' }}>Date: {new Date(invoiceLookupResult.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className={`badge ${invoiceLookupResult.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                    {invoiceLookupResult.status}
                  </span>
                </div>
              </div>

              {/* Items returning grid */}
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Quantity Purchased</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                      <th style={{ width: '150px' }}>Quantities to Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItemsList.map(item => (
                      <tr key={item.id}>
                        <td><code>{item.inventory_id}</code></td>
                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                        <td>${item.unit_price.toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>${item.total_price.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            min="0"
                            max={item.quantity}
                            value={returnQuantities[item.id] || 0}
                            onChange={e => setReturnQuantities({
                              ...returnQuantities,
                              [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value)))
                            })}
                            style={{ padding: '0.4rem', width: '80px', textAlign: 'center' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Reason and Submit */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                <div className="form-group">
                  <label className="form-label">Reason for Return</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Defective seam, incorrect sizing..."
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-danger" onClick={handleSalesReturn} disabled={isProcessingReturn}>
                    {isProcessingReturn ? 'Processing Return...' : 'Replenish Inventory & Issue Refund'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setInvoiceLookupResult(null); setInvoiceItemsList([]); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
