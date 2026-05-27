import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import type { Customer, Invoice } from '../types/database';
import { User, Phone, ShoppingBag, FileSpreadsheet, Search } from 'lucide-react';

export const CustomersPage = () => {
  const { tenant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerInvoices, setSelectedCustomerInvoices] = useState<Invoice[]>([]);
  const [selectedCustomerTotalSpend, setSelectedCustomerTotalSpend] = useState(0);

  // Load Customers list
  const loadCustomers = async () => {
    if (!tenant) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*');
      
      if (data) {
        setCustomers(data);
        if (data.length > 0) {
          setSelectedCustomerId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Selected Customer's Invoice Logs
  const loadCustomerHistory = async () => {
    if (!selectedCustomerId) return;
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', selectedCustomerId);

      if (data) {
        setSelectedCustomerInvoices(data.reverse());
        const total = data.reduce((acc: number, curr: Invoice) => acc + Number(curr.total_amount), 0);
        setSelectedCustomerTotalSpend(total);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [tenant]);

  useEffect(() => {
    loadCustomerHistory();
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // EXCEL EXPORT SCRIPT
  const handleExportCSV = () => {
    if (customers.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Customer ID,Name,Phone Number,Created Date\r\n';

    customers.forEach(cust => {
      csvContent += `"${cust.id}","${cust.name}","${cust.phone}","${new Date(cust.created_at).toLocaleDateString()}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Customers_Database_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient">Customer Directory</h1>
          <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Consolidated directory of client profiles, ledger accounts, and transaction records.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleExportCSV}>
          <FileSpreadsheet size={16} /> Export Customers List
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 2fr', gap: '1.75rem', flex: 1, minHeight: 0 }}>
        {/* Left Column: Customers List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', background: '#ffffff' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Store Clients</h2>
          
          <div className="form-group" style={{ marginBottom: '0.25rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--input-bg)' }}>
            <Search size={16} className="text-muted" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', flex: 1, padding: 0, fontSize: '0.85rem', boxShadow: 'none' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.25rem' }}>
            {filteredCustomers.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No customers match search criteria.</p>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = selectedCustomerId === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: isSelected ? 'var(--primary-glow)' : '#ffffff',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(0,0,0,0.04)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ 
                      padding: '0.4rem', 
                      borderRadius: '50%', 
                      background: isSelected ? 'rgba(59, 91, 255, 0.1)' : '#f8fafc', 
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={16} />
                    </div>
                    <div>
                      <h4 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 700, 
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)' 
                      }}>{cust.name}</h4>
                      <span className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem', fontWeight: 500 }}>
                        <Phone size={10} /> {cust.phone}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Customer Details & Purchases History */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', background: '#ffffff' }}>
          {selectedCustomer ? (
            <>
              {/* Profile Card Header */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ 
                  background: 'var(--primary-glow)', 
                  color: 'var(--primary)', 
                  width: '3.25rem', 
                  height: '3.25rem', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 8px -2px rgba(59, 91, 255, 0.15)'
                }}>
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-gradient-blue" style={{ fontSize: '1.35rem', fontWeight: 800 }}>{selectedCustomer.name}</h2>
                  <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                    <Phone size={12} className="text-muted" /> {selectedCustomer.phone}
                  </p>
                </div>
              </div>

              {/* Quick stats KPIs */}
              <div className="grid-cols-2">
                <div className="glass-panel" style={{ padding: '1rem 1.25rem', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SPEND (LIFETIME)</span>
                  <span className="text-gradient-blue" style={{ fontSize: '1.6rem', fontWeight: 800 }}>${selectedCustomerTotalSpend.toFixed(2)}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1rem 1.25rem', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICES PROCESSED</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>{selectedCustomerInvoices.length} billing(s)</span>
                </div>
              </div>

              {/* Purchase History Invoice Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <ShoppingBag size={16} className="text-primary" /> Purchase Ledger History
                </h3>

                <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                  {selectedCustomerInvoices.length === 0 ? (
                    <p className="text-muted" style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.9rem' }}>No purchase transactions logged for this client.</p>
                  ) : (
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Payment</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Secure Token</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCustomerInvoices.map(inv => (
                          <tr key={inv.id}>
                            <td><code>{inv.invoice_number}</code></td>
                            <td><span style={{ textTransform: 'uppercase', fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{inv.payment_method}</span></td>
                            <td>
                              <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                            <td><code>{inv.token}</code></td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>${inv.total_amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
              <User size={60} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Select a customer from the left directory column to view purchase transaction histories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
