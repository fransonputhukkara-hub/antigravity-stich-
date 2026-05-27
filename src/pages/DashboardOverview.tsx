import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import type { InventoryItem, Invoice, PurchaseEntry } from '../types/database';
import { DollarSign, Package, AlertTriangle, TrendingUp, ShoppingCart, Truck } from 'lucide-react';

export const DashboardOverview = () => {
  const { tenant, currentShop, shops } = useAuth();
  const [salesSum, setSalesSum] = useState(0);
  const [purchasesSum, setPurchasesSum] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [recentSales, setRecentSales] = useState<Invoice[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<PurchaseEntry[]>([]);

  const loadDashboardData = async () => {
    if (!tenant) return;
    try {
      // 1. Load total sales for the active tenant
      const { data: sales } = await supabase
        .from('invoices')
        .select('*');
      
      if (sales) {
        setRecentSales(sales.slice(-5).reverse());
        const sum = sales.reduce((acc: number, curr: Invoice) => acc + Number(curr.total_amount), 0);
        setSalesSum(sum);
      }

      // 2. Load total purchases for the active tenant (NEW supplier spend ledger)
      const { data: purchases } = await supabase
        .from('purchase_entries')
        .select('*');
      
      if (purchases) {
        setRecentPurchases(purchases.slice(-5).reverse());
        const sum = purchases.reduce((acc: number, curr: PurchaseEntry) => acc + Number(curr.total_amount), 0);
        setPurchasesSum(sum);
      }

      // 3. Load active branch inventory items and alerts
      if (currentShop) {
        const { data: items } = await supabase
          .from('inventory')
          .select('*')
          .eq('shop_id', currentShop.id);

        if (items) {
          setInventoryCount(items.length);
          const lowStockList = items.filter((it: InventoryItem) => it.quantity <= it.min_quantity_alert);
          setLowStockItems(lowStockList.slice(0, 5));
          setLowStockCount(lowStockList.length);
        }
      }
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [tenant, currentShop]);

  const currencySymbol = '$';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 className="text-gradient">Welcome back, {tenant?.name || 'Partner'}</h1>
        <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
          Real-time operating metrics and consolidated ledger overview.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-cols-4">
        {/* KPI 1: Gross Sales */}
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>GROSS SALES (REVENUE)</span>
              <div className="metric-value" style={{ color: 'var(--success)' }}>{currencySymbol}{salesSum.toFixed(2)}</div>
            </div>
            <div className="metric-card-icon-container" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Consolidated ledger sales earnings</span>
        </div>

        {/* KPI 2: Supplier Purchases */}
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>SUPPLIER PURCHASES (SPEND)</span>
              <div className="metric-value" style={{ color: 'var(--warning)' }}>{currencySymbol}{purchasesSum.toFixed(2)}</div>
            </div>
            <div className="metric-card-icon-container" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <Truck size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Wholesale inventory replenishments</span>
        </div>

        {/* KPI 3: Inventory Products */}
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL PRODUCTS (BRANCH)</span>
              <div className="metric-value text-gradient-blue">{inventoryCount} items</div>
            </div>
            <div className="metric-card-icon-container" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <Package size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Unique catalog rows active</span>
        </div>

        {/* KPI 4: Low Stock Alerts */}
        <div className="glass-panel metric-card" style={{ borderLeft: `4px solid ${lowStockCount > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>LOW STOCK ALERTS</span>
              <div className="metric-value" style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {lowStockCount} items
              </div>
            </div>
            <div className="metric-card-icon-container" style={{ 
              background: lowStockCount > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', 
              color: lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' 
            }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Items below threshold settings</span>
        </div>
      </div>

      {/* Main Grid: Lists and Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.75rem' }}>
        {/* Left Column: Recent Transactions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Recent Sales invoices */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <ShoppingCart size={18} className="text-success" /> Recent Sales Invoices
              </h3>
            </div>

            {recentSales.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem', padding: '1rem 0' }}>No invoice items logged yet. Open POS to checkout!</p>
            ) : (
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map(sale => (
                      <tr key={sale.id}>
                        <td><code>{sale.invoice_number}</code></td>
                        <td><span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{sale.payment_method}</span></td>
                        <td>
                          <span className={`badge ${sale.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {sale.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(sale.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>${sale.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Purchases entries */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Truck size={18} className="text-warning" /> Recent Supplier Purchases
              </h3>
            </div>

            {recentPurchases.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem', padding: '1rem 0' }}>No purchase entries logged. Replenish inventory in Purchases tab!</p>
            ) : (
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Total Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPurchases.map(pur => (
                      <tr key={pur.id}>
                        <td style={{ fontWeight: 600 }}>{pur.supplier_name}</td>
                        <td>
                          <span className="badge badge-warning">
                            {pur.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(pur.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>${pur.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Low Stock Sentinel & Branches list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Low Stock Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', border: lowStockCount > 0 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid var(--panel-border)' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <AlertTriangle size={18} className={lowStockCount > 0 ? 'text-danger' : 'text-success'} /> Low Stock Sentinel
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.825rem', marginTop: '0.15rem' }}>
                Items below critical levels for <strong>{currentShop?.name}</strong>.
              </p>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>All items have healthy stock levels!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex-between" style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</h4>
                      <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.1rem' }}>SKU: {item.sku || 'N/A'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-danger" style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.quantity} units left</span>
                      <p className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>Alert level: {item.min_quantity_alert}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Outlets Overview */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Branch & Warehouses</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {shops.map(shop => (
                <div key={shop.id} className="flex-between" style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{shop.name}</h4>
                    <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.1rem' }}>{shop.address || 'No address logged'}</span>
                  </div>
                  <div>
                    <span className={`badge ${shop.is_warehouse ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                      {shop.is_warehouse ? 'Warehouse HQ' : 'POS Outlet'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
