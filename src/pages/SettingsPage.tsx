import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Settings as SettingsIcon, Store, Save, Plus, CheckCircle, MessageSquare } from 'lucide-react';

export const SettingsPage = () => {
  const { tenant, settings, shops, refreshAuthData } = useAuth();
  
  // Settings State
  const [companyName, setCompanyName] = useState(settings?.company_name || tenant?.name || '');
  const [currency, setCurrency] = useState(settings?.currency || 'USD');
  const [taxPercent, setTaxPercent] = useState(settings?.tax_percentage || 5.0);
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings?.whatsapp_template || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // New Shop State
  const [newShopName, setNewShopName] = useState('');
  const [newShopType, setNewShopType] = useState<'pos' | 'warehouse'>('pos');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [shopSuccess, setShopSuccess] = useState(false);

  // SAVE SETTINGS
  const handleSaveSettings = async () => {
    if (!settings || !tenant) return;
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      // 1. Update Tenants table
      await supabase
        .from('tenants')
        .update({ name: companyName })
        .eq('id', tenant.id);

      // 2. Update Settings table
      const { error } = await supabase
        .from('settings')
        .update({
          company_name: companyName,
          currency,
          tax_percentage: Number(taxPercent),
          whatsapp_template: whatsappTemplate
        })
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      setSettingsSuccess(true);
      await refreshAuthData();
    } catch (e) {
      console.error(e);
      alert('Failed to update platform settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ADD NEW OUTLET SHOP/WAREHOUSE
  const handleAddShop = async () => {
    if (!newShopName || !tenant) {
      alert('Please enter a shop branch name.');
      return;
    }
    
    // Enforce business limit: Only 1 Warehouse HQ allowed
    const warehouseExists = shops.some(s => s.is_warehouse);
    if (newShopType === 'warehouse' && warehouseExists) {
      alert('A Central Warehouse HQ already exists! You are only permitted to provision one Warehouse HQ per company workspace.');
      return;
    }

    setIsSavingShop(true);
    setShopSuccess(false);
    try {
      const { error } = await supabase
        .from('shops')
        .insert({
          tenant_id: tenant.id,
          name: newShopName,
          is_warehouse: newShopType === 'warehouse',
          address: newShopAddress || null,
          phone: newShopPhone || null
        });

      if (error) throw error;

      setShopSuccess(true);
      setNewShopName('');
      setNewShopAddress('');
      setNewShopPhone('');
      await refreshAuthData();
    } catch (e) {
      console.error(e);
      alert('Failed to provision new shop outlet.');
    } finally {
      setIsSavingShop(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 className="text-gradient">Workspace Settings</h1>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Configure company branding parameters, taxation rates, WhatsApp POS messaging templates, and shop outlets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Company & WhatsApp Templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* General settings */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SettingsIcon size={18} /> Company Branding & Tax
            </h2>

            {settingsSuccess && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> Platform branding values saved successfully!
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Registered Corporate Name</label>
              <input
                type="text"
                className="form-input"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Base Transaction Currency</label>
                <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="USD">USD ($) US Dollar</option>
                  <option value="EUR">EUR (€) Euro</option>
                  <option value="GBP">GBP (£) British Pound</option>
                  <option value="INR">INR (₹) Indian Rupee</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Default Tax / VAT Rate (%)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxPercent}
                  onChange={e => setTaxPercent(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp POS text template customization */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} /> WhatsApp Text Invoice Template
            </h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Customize the messaging layouts sent to customers upon checkout. Use the following hooks: 
              <code>{"{customer}"}</code>, <code>{"{invoice}"}</code>, <code>{"{items}"}</code>, <code>{"{total}"}</code>, <code>{"{invoice_link}"}</code>.
            </p>

            <div className="form-group">
              <textarea
                className="form-input"
                value={whatsappTemplate}
                onChange={e => setWhatsappTemplate(e.target.value)}
                style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.4' }}
                placeholder="🧾 STITCH BILL Ledger..."
              />
            </div>

            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={isSavingSettings} style={{ alignSelf: 'flex-start' }}>
              <Save size={16} /> {isSavingSettings ? 'Saving Settings...' : 'Commit Workspace Changes'}
            </button>
          </div>
        </div>

        {/* Right Column: Outlets Provisioner & Shops list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Add a new branch */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Store size={18} /> Provision New Shop Outlet
            </h2>

            {shopSuccess && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> New shop outlet successfully provisioned!
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Shop/Warehouse Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. StitchBill Downtown Express"
                value={newShopName}
                onChange={e => { setNewShopName(e.target.value); setShopSuccess(false); }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location Outlet Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="radio" checked={newShopType === 'pos'} onChange={() => setNewShopType('pos')} /> POS Retail Branch
                  </label>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem', 
                    fontSize: '0.9rem', 
                    cursor: shops.some(s => s.is_warehouse) ? 'not-allowed' : 'pointer',
                    color: shops.some(s => s.is_warehouse) ? 'var(--text-muted)' : 'inherit',
                    opacity: shops.some(s => s.is_warehouse) ? 0.5 : 1
                  }}>
                    <input 
                      type="radio" 
                      checked={newShopType === 'warehouse'} 
                      disabled={shops.some(s => s.is_warehouse)}
                      onChange={() => setNewShopType('warehouse')} 
                    /> Central Warehouse HQ
                  </label>
                </div>
                {shops.some(s => s.is_warehouse) && (
                  <span style={{ fontSize: '0.725rem', color: 'var(--warning)', fontWeight: 600, display: 'block', marginTop: '0.1rem' }}>
                    ⚠️ Central Warehouse already exists. You are allowed only 1 warehouse HQ.
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Branch Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 50 Broadway Ave, NYC"
                value={newShopAddress}
                onChange={e => setNewShopAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+1 (555) 777-0000"
                value={newShopPhone}
                onChange={e => setNewShopPhone(e.target.value)}
              />
            </div>

            <button className="btn btn-primary w-full" onClick={handleAddShop} disabled={isSavingShop || !newShopName}>
              <Plus size={16} /> {isSavingShop ? 'Provisioning...' : 'Provision Outlet'}
            </button>
          </div>

          {/* Current list of branches */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Provisioned Location Outlets ({shops.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {shops.map(shop => (
                <div key={shop.id} className="flex-between" style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{shop.name}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>{shop.address || 'Address not logged'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: shop.is_warehouse ? 'var(--warning-glow)' : 'var(--primary-glow)', color: shop.is_warehouse ? 'var(--warning)' : 'var(--primary)', fontWeight: 600 }}>
                      {shop.is_warehouse ? 'Warehouse' : 'Outlet'}
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
