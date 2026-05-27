import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import type { InventoryItem, PurchaseEntry } from '../types/database';
import { Plus, Trash, CheckCircle, Truck, FileSpreadsheet, ArrowLeftRight, Search } from 'lucide-react';

interface PurchaseLine {
  inventory_id: string;
  name: string;
  quantity: number;
  buying_price: number;
}

export const PurchasesPage = () => {
  const { tenant, currentShop } = useAuth();
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'return'>('entry');

  // Common State
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntry[]>([]);

  // Purchase Entry State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [addQty, setAddQty] = useState(10);
  const [addCost, setAddCost] = useState(15.00);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [entrySuccess, setEntrySuccess] = useState(false);

  // Return State
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [returnAmount, setReturnAmount] = useState(0);
  const [returnReason, setReturnReason] = useState('Damaged shipping bundle');
  const [selectedReturnItemId, setSelectedReturnItemId] = useState('');
  const [returnQty, setReturnQty] = useState(5);
  const [isSavingReturn, setIsSavingReturn] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!currentShop) return;
    try {
      // 1. Fetch Inventory items
      const { data: inv } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', currentShop.id);
      if (inv) {
        setInventoryList(inv);
        if (inv.length > 0) setSelectedInventoryId(inv[0].id);
      }

      // 2. Fetch Purchase History entries
      const { data: pur } = await supabase
        .from('purchase_entries')
        .select('*')
        .eq('shop_id', currentShop.id);
      if (pur) {
        setPurchaseEntries(pur);
        if (pur.length > 0) setSelectedPurchaseId(pur[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentShop]);

  // ADD PURCHASE LINE TEMP CART
  const addPurchaseLine = () => {
    if (!selectedInventoryId) return;
    const targetItem = inventoryList.find(it => it.id === selectedInventoryId);
    if (!targetItem) return;

    const existingIdx = purchaseLines.findIndex(l => l.inventory_id === selectedInventoryId);
    if (existingIdx > -1) {
      alert('This product line is already added below. Adjust quantities there or remove first.');
      return;
    }

    setPurchaseLines([
      ...purchaseLines,
      {
        inventory_id: selectedInventoryId,
        name: targetItem.name,
        quantity: addQty,
        buying_price: addCost
      }
    ]);
  };

  const removePurchaseLine = (idx: number) => {
    setPurchaseLines(purchaseLines.filter((_, i) => i !== idx));
  };

  const purchaseLinesTotal = purchaseLines.reduce((acc, curr) => acc + (curr.buying_price * curr.quantity), 0);

  // SAVE PURCHASE ENTRY (Replenish stock & update buying prices)
  const handleSavePurchaseEntry = async () => {
    if (!supplierName || purchaseLines.length === 0) {
      alert('Please enter a Supplier Name and add at least 1 product line.');
      return;
    }
    setIsSavingEntry(true);
    try {
      // 1. Insert Purchase Entry
      const { data: entry, error: entryErr } = await supabase
        .from('purchase_entries')
        .insert({
          tenant_id: tenant?.id,
          shop_id: currentShop?.id,
          supplier_name: supplierName,
          supplier_phone: supplierPhone || null,
          total_amount: purchaseLinesTotal,
          status: 'received'
        })
        .select()
        .single();

      if (entryErr || !entry) throw entryErr || new Error('Failed to save purchase ledger');

      // 2. Replenish items stock and update item buying prices in inventory
      for (const line of purchaseLines) {
        const invItem = inventoryList.find(it => it.id === line.inventory_id);
        if (!invItem) continue;

        await supabase
          .from('inventory')
          .update({
            quantity: invItem.quantity + line.quantity,
            buying_price: line.buying_price // Update item wholesale cost price
          })
          .eq('id', line.inventory_id);
      }

      setEntrySuccess(true);
      setSupplierName('');
      setSupplierPhone('');
      setPurchaseLines([]);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Purchase entry failed to save.');
    } finally {
      setIsSavingEntry(false);
    }
  };

  // SAVE PURCHASE RETURN
  const handleSavePurchaseReturn = async () => {
    if (!selectedPurchaseId || !selectedReturnItemId || returnQty <= 0) {
      alert('Please specify an active Purchase order, target item, and return quantity.');
      return;
    }
    setIsSavingReturn(true);
    try {
      const targetItem = inventoryList.find(it => it.id === selectedReturnItemId);
      if (!targetItem) return;

      if (targetItem.quantity < returnQty) {
        alert(`Insufficient stock remaining in inventory! You only have ${targetItem.quantity} items left to return.`);
        setIsSavingReturn(false);
        return;
      }

      const calculatedRefund = targetItem.buying_price * returnQty;

      // 1. Insert Purchase Return
      await supabase.from('purchase_returns').insert({
        tenant_id: tenant?.id,
        purchase_entry_id: selectedPurchaseId,
        returned_amount: calculatedRefund,
        reason: returnReason
      });

      // 2. Deduct quantities from inventory stock
      await supabase
        .from('inventory')
        .update({
          quantity: Math.max(0, targetItem.quantity - returnQty)
        })
        .eq('id', selectedReturnItemId);

      setReturnSuccessMsg(`Successfully processed return of ${returnQty} items. Supplier credit of $${calculatedRefund.toFixed(2)} generated!`);
      setReturnQty(5);
      setSelectedReturnItemId('');
      loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to process purchase return.');
    } finally {
      setIsSavingReturn(false);
    }
  };

  // EXCEL EXPORT SCRIPT
  const handleExportCSV = () => {
    if (purchaseEntries.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Purchase ID,Supplier Name,Supplier Phone,Total Spend,Status,Date\r\n';

    purchaseEntries.forEach(entry => {
      csvContent += `"${entry.id}","${entry.supplier_name}","${entry.supplier_phone || ''}",${entry.total_amount},"${entry.status}","${new Date(entry.created_at).toLocaleDateString()}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Ledger_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient">Purchases & Procurement</h1>
          <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Consolidated log of inbound supplier stock invoices, wholesale procurement, and return ledgers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${activeTab === 'entry' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('entry')}>
            <Truck size={18} /> New Purchase Entry
          </button>
          <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>
            <FileSpreadsheet size={18} /> Inbound History
          </button>
          <button className={`btn ${activeTab === 'return' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setActiveTab('return')}>
            <ArrowLeftRight size={18} /> Supplier Returns
          </button>
        </div>
      </div>

      {activeTab === 'entry' ? (
        /* ==================== NEW PURCHASE ENTRY ==================== */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.75rem' }}>
          {/* Supplier details and Line adder */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content', background: '#ffffff' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Procurement & Supplier</h2>

            {entrySuccess && (
              <div className="badge badge-success w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                <CheckCircle size={18} /> Stock replenishment logged successfully!
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Supplier / Brand Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ThreadWorks Textiles"
                value={supplierName}
                onChange={e => { setSupplierName(e.target.value); setEntrySuccess(false); }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Supplier Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+1 (555) 888-0000"
                value={supplierPhone}
                onChange={e => setSupplierPhone(e.target.value)}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Product Line to Inbound Invoice</h3>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Select Catalog Product</label>
                <select className="form-input" value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}>
                  {inventoryList.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.sku || 'No SKU'})</option>
                  ))}
                </select>
              </div>

              <div className="grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity Received</label>
                  <input
                    type="number"
                    className="form-input"
                    value={addQty}
                    onChange={e => setAddQty(Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Supplier Unit Cost ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={addCost}
                    onChange={e => setAddCost(Number(e.target.value))}
                  />
                </div>
              </div>

              <button className="btn btn-secondary w-full" onClick={addPurchaseLine}>
                + Append Inbound Product Line
              </button>
            </div>
          </div>

          {/* Current Inbound Invoice Lines Preview */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '400px', background: '#ffffff' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Procurement Inbound Lines</h2>

              {purchaseLines.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--text-muted)' }}>
                  <Truck size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>No inbound invoice lines added yet.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit Cost</th>
                        <th>Total Cost</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseLines.map((line, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{line.name}</td>
                          <td style={{ fontWeight: 700 }}>{line.quantity}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>${line.buying_price.toFixed(2)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${(line.buying_price * line.quantity).toFixed(2)}</td>
                          <td>
                            <button className="btn btn-ghost text-danger" style={{ padding: '0.2rem' }} onClick={() => removePurchaseLine(idx)}>
                              <Trash size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {purchaseLines.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '2rem' }}>
                <div className="flex-between" style={{ marginBottom: '1rem', fontSize: '1.15rem', fontWeight: 800 }}>
                  <span>Total Inbound Spend:</span>
                  <span className="text-gradient-blue">${purchaseLinesTotal.toFixed(2)}</span>
                </div>
                <button className="btn btn-primary w-full" onClick={handleSavePurchaseEntry} disabled={isSavingEntry}>
                  {isSavingEntry ? 'Logging Procurement...' : `Commit Purchase Entry & Replenish ($${purchaseLinesTotal.toFixed(2)})`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'history' ? (
        /* ==================== INBOUND PROCUREMENT HISTORY ==================== */
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
          <div className="flex-between">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Inbound Purchase Invoices</h2>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <FileSpreadsheet size={16} /> Export Inbound Ledger
            </button>
          </div>

          {purchaseEntries.length === 0 ? (
            <p className="text-muted" style={{ padding: '2rem 0', textAlign: 'center' }}>No inbound purchase entries found in branch history.</p>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Invoice Date</th>
                    <th>Supplier / Brand Name</th>
                    <th>Supplier Phone</th>
                    <th>Procurement Status</th>
                    <th style={{ textAlign: 'right' }}>Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseEntries.map(entry => (
                    <tr key={entry.id}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(entry.created_at).toLocaleString()}</td>
                      <td><strong>{entry.supplier_name}</strong></td>
                      <td>{entry.supplier_phone || 'N/A'}</td>
                      <td>
                        <span className="badge badge-success">
                          {entry.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>${entry.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ==================== SUPPLIER RETURNS ==================== */
        <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800 }}>Return Damaged Stock to Suppliers</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Process supplier refunds and deduct damaged stock directly from branch inventory counts.</p>

          {returnSuccessMsg && (
            <div className="badge badge-success w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
              <CheckCircle size={16} /> {returnSuccessMsg}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Active Procurement Order</label>
            <select className="form-input" value={selectedPurchaseId} onChange={e => { setSelectedPurchaseId(e.target.value); setReturnSuccessMsg(null); }}>
              {purchaseEntries.map(entry => (
                <option key={entry.id} value={entry.id}>
                  {entry.supplier_name} - ${entry.total_amount.toFixed(2)} ({new Date(entry.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Defective/Damaged Product</label>
            <select className="form-input" value={selectedReturnItemId} onChange={e => setSelectedReturnItemId(e.target.value)}>
              <option value="">-- Select Product --</option>
              {inventoryList.map(item => (
                <option key={item.id} value={item.id}>{item.name} (Stock: {item.quantity})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Quantity to Return</label>
            <input
              type="number"
              className="form-input"
              value={returnQty}
              onChange={e => setReturnQty(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Return Reason</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Broken packaging / incorrect fabric rolls"
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
          </div>

          <button className="btn btn-danger w-full mt-2" onClick={handleSavePurchaseReturn} disabled={isSavingReturn || !selectedReturnItemId}>
            {isSavingReturn ? 'Processing Return...' : 'Replenish Supplier Credit & Deduct Stock'}
          </button>
        </div>
      )}
    </div>
  );
};
