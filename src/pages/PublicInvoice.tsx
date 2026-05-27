import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Printer, Download, CheckCircle, Store, ShieldCheck } from 'lucide-react';

export const PublicInvoicePage = () => {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [tenantName, setTenantName] = useState('StitchBill Retailer');
  const [branchName, setBranchName] = useState('Main Branch');
  const [customerName, setCustomerName] = useState('Valued Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadInvoiceData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      
      // 1. Fetch public invoice by secure token (RLS lets anyone select if token matches)
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('token', token)
        .single();

      if (invErr || !inv) {
        console.error(invErr);
        setIsLoading(false);
        return;
      }

      setInvoice(inv);

      // 2. Fetch Invoice Items
      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', inv.id);
      
      if (items) setInvoiceItems(items);

      // 3. Fetch Tenant/Company Branding
      const { data: ten } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', inv.tenant_id)
        .single();
      if (ten) setTenantName(ten.name);

      // 4. Fetch Branch details
      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', inv.shop_id)
        .single();
      if (shop) setBranchName(shop.name);

      // 5. Fetch Customer details if linked
      if (inv.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('name, phone')
          .eq('id', inv.customer_id)
          .single();
        if (cust) {
          setCustomerName(cust.name);
          setCustomerPhone(cust.phone);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="app-container items-center justify-center flex-col" style={{ background: 'var(--bg-color)', width: '100vw', height: '100vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="app-container items-center justify-center flex-col text-center" style={{ background: 'var(--bg-color)', width: '100vw', height: '100vh', gap: '1rem' }}>
        <h2 className="text-danger" style={{ fontSize: '1.75rem' }}>Invoice Not Found</h2>
        <p className="text-secondary" style={{ maxWidth: '350px' }}>
          This invoice secure token is invalid or the transaction has been cleared from our databases.
        </p>
      </div>
    );
  }

  // Calculate items subtotal
  const subtotal = invoiceItems.reduce((acc, curr) => acc + Number(curr.total_price), 0);

  return (
    <div style={{ background: 'radial-gradient(circle at 100% 0%, #eef3ff 0%, #f6f8fc 100%)', minHeight: '100vh', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="bg-grid-overlay"></div>
      
      {/* Floating Action Controls (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '640px', marginBottom: '1.5rem' }}>
        <button className="btn btn-primary" onClick={handlePrint} style={{ flex: 1 }}>
          <Printer size={18} /> Print Receipt
        </button>
        <button className="btn btn-secondary" onClick={handlePrint} style={{ flex: 1 }}>
          <Download size={18} /> Save as PDF
        </button>
      </div>

      {/* Branded Glassmorphic Receipt Sheet */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', border: '1px solid var(--panel-border)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--panel-bg)' }}>
        
        {/* Invoice Branding Header */}
        <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 className="text-gradient-blue" style={{ fontSize: '2rem', fontWeight: 800 }}>{tenantName}</h1>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Store size={12} /> {branchName}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--success-glow)', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldCheck size={12} /> SECURE INVOICE
            </span>
            <h2 style={{ fontSize: '1.25rem', marginTop: '0.4rem', fontWeight: 700 }}>{invoice.invoice_number}</h2>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Date: {new Date(invoice.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Billing recipient details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.9rem' }}>
          <div>
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Billed Customer</span>
            <h4 style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 600 }}>{customerName}</h4>
            {customerPhone && <p className="text-secondary" style={{ marginTop: '0.15rem', fontSize: '0.85rem' }}>Phone: {customerPhone}</p>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Payment Details</span>
            <h4 style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase' }}>Method: {invoice.payment_method}</h4>
            <p className="text-secondary" style={{ marginTop: '0.15rem', fontSize: '0.85rem' }}>Status: Paid & Settled</p>
          </div>
        </div>

        {/* Invoice Item Lines Table */}
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Purchased Product ID</th>
                <th>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map(item => (
                <tr key={item.id}>
                  <td><code>{item.inventory_id}</code></td>
                  <td>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>${item.unit_price.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Subtotals block */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.925rem' }}>
          <div className="flex-between">
            <span className="text-secondary">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex-between">
            <span className="text-secondary">Tax / VAT Charges</span>
            <span>+${invoice.tax_amount.toFixed(2)}</span>
          </div>

          {invoice.discount_amount > 0 && (
            <div className="flex-between">
              <span className="text-secondary">Promo Discount</span>
              <span className="text-danger">-${invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex-between" style={{ fontSize: '1.4rem', fontWeight: 800, borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <span>Grand Total Paid</span>
            <span className="text-gradient-blue">${invoice.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer Greetings */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>Thank you for shopping with us! This invoice is digitally certified.</p>
          <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem' }}>Secure Token: <code>{invoice.token}</code></span>
        </div>
      </div>

      {/* Print Specific CSS Overrides */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .glass-panel {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .text-gradient, .text-gradient-blue {
            background: none !important;
            -webkit-text-fill-color: black !important;
            color: black !important;
          }
          .premium-table th {
            background: rgba(0,0,0,0.05) !important;
            color: black !important;
            border-bottom: 2px solid black !important;
          }
          .premium-table td {
            border-bottom: 1px solid rgba(0,0,0,0.1) !important;
            color: black !important;
          }
          code {
            color: black !important;
            background: none !important;
            padding: 0 !important;
          }
          .text-secondary, .text-muted {
            color: rgba(0,0,0,0.6) !important;
          }
        }
      `}</style>
    </div>
  );
};
export default PublicInvoicePage;
