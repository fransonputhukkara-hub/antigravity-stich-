import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import type { InventoryItem } from '../types/database';
import { Search, Plus, Edit2, Trash2, CheckCircle, FileSpreadsheet, Package, AlertCircle } from 'lucide-react';

export const InventoryPage = () => {
  const { tenant, currentShop } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<InventoryItem | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [buyingPrice, setBuyingPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [minAlert, setMinAlert] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const loadInventory = async () => {
    if (!currentShop) return;
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('shop_id', currentShop.id);
      if (data) setInventory(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [currentShop]);

  const openAddModal = () => {
    setIsEditing(null);
    setName('');
    setSku('');
    setBarcode('');
    setBuyingPrice(0);
    setSellingPrice(0);
    setQuantity(0);
    setMinAlert(5);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setIsEditing(item);
    setName(item.name);
    setSku(item.sku || '');
    setBarcode(item.barcode || '');
    setBuyingPrice(item.buying_price);
    setSellingPrice(item.selling_price);
    setQuantity(item.quantity);
    setMinAlert(item.min_quantity_alert);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  // SAVE PRODUCT (Add or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentShop || !tenant) {
      alert('Please enter a product name.');
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        // Update product
        const { error } = await supabase
          .from('inventory')
          .update({
            name,
            sku: sku || null,
            barcode: barcode || null,
            buying_price: Number(buyingPrice),
            selling_price: Number(sellingPrice),
            quantity: Number(quantity),
            min_quantity_alert: Number(minAlert)
          })
          .eq('id', isEditing.id);

        if (error) throw error;
        setSuccessMsg('Product updated successfully!');
      } else {
        // Add new product
        const { error } = await supabase
          .from('inventory')
          .insert({
            tenant_id: tenant.id,
            shop_id: currentShop.id,
            name,
            sku: sku || null,
            barcode: barcode || null,
            buying_price: Number(buyingPrice),
            selling_price: Number(sellingPrice),
            quantity: Number(quantity),
            min_quantity_alert: Number(minAlert)
          });

        if (error) throw error;
        setSuccessMsg('Product added successfully!');
      }
      setIsModalOpen(false);
      loadInventory();
    } catch (e) {
      console.error(e);
      alert('Failed to save product in database catalog.');
    } finally {
      setIsSaving(false);
    }
  };

  // DELETE PRODUCT
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product from the catalog? This is permanent.')) return;
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMsg('Product deleted successfully.');
      loadInventory();
    } catch (e) {
      console.error(e);
      alert('Failed to delete catalog item.');
    }
  };

  // EXCEL EXPORT
  const handleExportCSV = () => {
    if (inventory.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SKU,Barcode,Product Name,Buying Price (Cost),Selling Price,Quantity,Min Alert Level\r\n';

    inventory.forEach(item => {
      csvContent += `"${item.sku || ''}","${item.barcode || ''}","${item.name}",${item.buying_price},${item.selling_price},${item.quantity},${item.min_quantity_alert}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_${currentShop?.name || 'Outlet'}.csv`);
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
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="text-gradient">Catalog Inventory Management</h1>
          <p className="text-secondary" style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Outlet: <strong className="text-gradient-blue">{currentShop?.name || 'Loading branch...'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Add New Product
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FileSpreadsheet size={18} /> Export Inventory
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="badge badge-success w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Search Filter Panel */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={18} className="text-muted" />
        <input
          type="text"
          className="form-input"
          placeholder="Search by product name, SKU, or barcode..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ border: 'none', background: 'transparent', flex: 1, padding: 0, boxShadow: 'none' }}
        />
      </div>

      {/* Inventory table list */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {filteredInventory.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-muted)' }}>
            <Package size={60} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No products found in this branch catalog.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Wholesale Cost (Buying)</th>
                  <th>Retail Price (Selling)</th>
                  <th>Stock Quantity</th>
                  <th>Alert Level</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const isLow = item.quantity <= item.min_quantity_alert;
                  return (
                    <tr key={item.id} style={{ borderLeft: isLow ? '3px solid var(--danger)' : 'none' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                          {isLow && (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                              <AlertCircle size={10} /> Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td><code>{item.sku || 'N/A'}</code></td>
                      <td><code>{item.barcode || 'N/A'}</code></td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>${item.buying_price.toFixed(2)}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 700 }}>${item.selling_price.toFixed(2)}</td>
                      <td style={{ fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--text-primary)' }}>{item.quantity}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.min_quantity_alert} units</td>
                      <td style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '6px', boxShadow: 'none' }} onClick={() => openEditModal(item)}>
                          <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                        </button>
                        <button className="btn btn-ghost text-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteProduct(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit product modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSaveProduct} className="glass-panel animate-fade-in" style={{ width: '480px', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(59, 91, 255, 0.08)', background: '#ffffff', boxShadow: 'var(--shadow-xl)' }}>
            <h2 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{isEditing ? 'Update Product Catalog' : 'Add New Store Product'}</h2>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Vintage Cotton Linen T-Shirt"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SKU Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="TSHIRT-WHT-XL"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Barcode / UPC</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="880123456789"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Wholesale Cost (Buying $)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={buyingPrice}
                  onChange={e => setBuyingPrice(Number(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Retail Price (Selling $)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Initial Stock Qty</label>
                <input
                  type="number"
                  className="form-input"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Min Alert Level</label>
                <input
                  type="number"
                  className="form-input"
                  value={minAlert}
                  onChange={e => setMinAlert(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary w-full" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving Product...' : isEditing ? 'Update Item' : 'Add to Catalog'}
              </button>
              <button className="btn btn-secondary w-full" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
