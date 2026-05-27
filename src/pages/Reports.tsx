import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import type { Invoice, PurchaseEntry } from '../types/database';
import { FileSpreadsheet, Plus, CheckCircle, TrendingUp, TrendingDown, DollarSign, PieChart, ShieldAlert } from 'lucide-react';

interface Expense {
  id: string;
  tenant_id: string;
  shop_id: string;
  category: string;
  amount: number;
  description: string;
  created_at: string;
}

export const ReportsPage = () => {
  const { tenant, currentShop } = useAuth();
  
  // Platform Ledger Metrics
  const [salesSum, setSalesSum] = useState(0);
  const [procurementSum, setProcurementSum] = useState(0);
  const [expensesSum, setExpensesSum] = useState(0);

  // Lists
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);

  // Payment Breakdown counters
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    cash: 0,
    card: 0,
    upi: 0,
    credit: 0
  });

  // Expense Logger form state
  const [expenseCategory, setExpenseCategory] = useState('Rent');
  const [expenseAmount, setExpenseAmount] = useState(150);
  const [expenseDescription, setExpenseDescription] = useState('Utility grid and outlet contribution');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseSuccess, setExpenseSuccess] = useState(false);

  const loadReportsData = async () => {
    if (!tenant || !currentShop) return;
    try {
      // 1. Fetch Invoices Sales
      const { data: sales } = await supabase
        .from('invoices')
        .select('*');

      if (sales) {
        setInvoices(sales);
        const sum = sales.reduce((acc: number, curr: Invoice) => acc + Number(curr.total_amount), 0);
        setSalesSum(sum);

        // Payment breakdown aggregation
        const counts = { cash: 0, card: 0, upi: 0, credit: 0 };
        sales.forEach((inv: Invoice) => {
          if (inv.payment_method in counts) {
            counts[inv.payment_method as keyof typeof counts] += Number(inv.total_amount);
          }
        });
        setPaymentBreakdown(counts);
      }

      // 2. Fetch Supplier Purchases replenishment costs
      const { data: purs } = await supabase
        .from('purchase_entries')
        .select('*');

      if (purs) {
        setPurchases(purs);
        const sum = purs.reduce((acc: number, curr: PurchaseEntry) => acc + Number(curr.total_amount), 0);
        setProcurementSum(sum);
      }

      // 3. Fetch Expense Logs
      const { data: exps } = await supabase
        .from('expenses')
        .select('*')
        .eq('shop_id', currentShop.id);

      if (exps) {
        setExpensesList(exps);
        const sum = exps.reduce((acc: number, curr: Expense) => acc + Number(curr.amount), 0);
        setExpensesSum(sum);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [tenant, currentShop]);

  // SAVE EXPENSE
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || !tenant || !currentShop) return;
    setIsSavingExpense(true);
    setExpenseSuccess(false);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          tenant_id: tenant.id,
          shop_id: currentShop.id,
          category: expenseCategory,
          amount: Number(expenseAmount),
          description: expenseDescription
        });

      if (error) throw error;
      setExpenseSuccess(true);
      setExpenseDescription('');
      setExpenseAmount(0);
      loadReportsData();
    } catch (e) {
      console.error(e);
      alert('Failed to log business expense.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  // EXCEL EXPORTS
  const handleExportCSV = () => {
    if (expensesList.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Expense ID,Category,Amount,Description,Date\r\n';

    expensesList.forEach(exp => {
      csvContent += `"${exp.id}","${exp.category}",${exp.amount},"${exp.description}","${new Date(exp.created_at).toLocaleDateString()}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Report_${currentShop?.name || 'Shop'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Profit Margins (Gross Revenues minus Inbound Stock Replenishments minus Office Expenses)
  const netProfitMargin = salesSum - procurementSum - expensesSum;

  // Percentage Calculations for Payment breakdowns
  const totalPaymentSum = Object.values(paymentBreakdown).reduce((a, b) => a + b, 0) || 1;
  const getPercentage = (val: number) => ((val / totalPaymentSum) * 100).toFixed(1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient">Platform Reports & Analytics</h1>
          <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Outlet: <strong className="text-gradient-blue">{currentShop?.name || 'Loading branch...'}</strong>
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleExportCSV}>
          <FileSpreadsheet size={16} /> Export Expenses List
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-cols-3">
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>GROSS SALES EARNINGS</span>
              <div className="metric-value text-success">${salesSum.toFixed(2)}</div>
            </div>
            <div className="metric-card-icon-container" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Revenues from {invoices.length} POS sales</span>
        </div>

        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>PROCUREMENT & EXPENSES</span>
              <div className="metric-value text-warning">${(procurementSum + expensesSum).toFixed(2)}</div>
            </div>
            <div className="metric-card-icon-container" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Procurement: ${procurementSum.toFixed(2)} | Operating: ${expensesSum.toFixed(2)}</span>
        </div>

        <div className="glass-panel metric-card" style={{ borderLeft: `4px solid ${netProfitMargin >= 0 ? 'var(--primary)' : 'var(--danger)'}` }}>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="text-muted" style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em' }}>NET BALANCED MARGINS</span>
              <div className="metric-value" style={{ color: netProfitMargin >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                ${netProfitMargin.toFixed(2)}
              </div>
            </div>
            <div className="metric-card-icon-container" style={{ 
              background: netProfitMargin >= 0 ? 'var(--primary-glow)' : 'var(--danger-bg)', 
              color: netProfitMargin >= 0 ? 'var(--primary)' : 'var(--danger)' 
            }}>
              <DollarSign size={20} />
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Total operating bottom-line margin</span>
        </div>
      </div>

      {/* Reports Main Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.75fr', gap: '1.75rem' }}>
        {/* Left Column: Expense Logger and Payment Method Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Add Expense form */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown size={18} /> Record Operating Expense
            </h2>

            {expenseSuccess && (
              <div className="badge badge-success w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                <CheckCircle size={18} /> Business expense successfully logged!
              </div>
            )}

            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expense Category</label>
                  <select className="form-input" value={expenseCategory} onChange={e => { setExpenseCategory(e.target.value); setExpenseSuccess(false); }} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                    <option value="Rent">Rent / Landlord</option>
                    <option value="Electricity">Electricity / Utility</option>
                    <option value="Salary">Staff Payroll Salary</option>
                    <option value="Shipping">Shipping Freight</option>
                    <option value="Packing">Packing Supplies</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expense Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={expenseAmount}
                    onChange={e => { setExpenseAmount(Number(e.target.value)); setExpenseSuccess(false); }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expenditure Description *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Electricity bill for downtown boutique outlet"
                  value={expenseDescription}
                  onChange={e => { setExpenseDescription(e.target.value); setExpenseSuccess(false); }}
                />
              </div>

              <button className="btn btn-danger w-full mt-2" type="submit" disabled={isSavingExpense || expenseAmount <= 0}>
                {isSavingExpense ? 'Logging Expense...' : 'Log Operating Expense'}
              </button>
            </form>
          </div>

          {/* Payment Methods proportional breakdown visualizer */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={18} /> Payment Methods breakdown
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Cash */}
              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Cash Payments</span>
                  <strong>${paymentBreakdown.cash.toFixed(2)} ({getPercentage(paymentBreakdown.cash)}%)</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${getPercentage(paymentBreakdown.cash)}%`, background: 'var(--success)' }}></div>
                </div>
              </div>

              {/* Card */}
              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Card Payments</span>
                  <strong>${paymentBreakdown.card.toFixed(2)} ({getPercentage(paymentBreakdown.card)}%)</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${getPercentage(paymentBreakdown.card)}%`, background: 'var(--primary)' }}></div>
                </div>
              </div>

              {/* UPI */}
              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>UPI / QR Scan</span>
                  <strong>${paymentBreakdown.upi.toFixed(2)} ({getPercentage(paymentBreakdown.upi)}%)</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${getPercentage(paymentBreakdown.upi)}%`, background: '#8b5cf6' }}></div>
                </div>
              </div>

              {/* Credit */}
              <div>
                <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Credit / Accounts Ledger</span>
                  <strong>${paymentBreakdown.credit.toFixed(2)} ({getPercentage(paymentBreakdown.credit)}%)</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${getPercentage(paymentBreakdown.credit)}%`, background: 'var(--warning)' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Logged Operating Expenses table */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', background: '#ffffff' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Outlet Operating Expenses</h2>

          {expensesList.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
              <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>No operating expenses recorded for this branch. Log one on the left!</p>
            </div>
          ) : (
            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesList.map(exp => (
                    <tr key={exp.id}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(exp.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{exp.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>${exp.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
