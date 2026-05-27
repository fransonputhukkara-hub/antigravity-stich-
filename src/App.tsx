import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DashboardOverview } from './pages/DashboardOverview';
import { BillingPage } from './pages/Billing';
import { PurchasesPage } from './pages/Purchases';
import { CustomersPage } from './pages/CustomersPage';
import { SettingsPage } from './pages/SettingsPage';
import { InventoryPage } from './pages/Inventory';
import { ReportsPage } from './pages/Reports';
import { PublicInvoicePage } from './pages/PublicInvoice';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Truck, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Store,
  UserCheck,
  Package,
  BarChart3
} from 'lucide-react';

// ==================== AUTH PAGE ====================
const AuthPage = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg(null);
    setIsSaving(true);
    try {
      if (isLogin) {
        const { error } = await login(email, password);
        if (error) setErrorMsg(error.message || 'Invalid email or password.');
      } else {
        if (!name) {
          setErrorMsg('Please enter your full name.');
          setIsSaving(false);
          return;
        }
        const { error } = await register(email, password, name);
        if (error) setErrorMsg(error.message || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-container items-center justify-center animate-fade-in" style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="bg-grid-overlay"></div>
      <div className="glass-panel animate-fade-in" style={{ 
        padding: '3rem 2.5rem', 
        maxWidth: '440px', 
        width: '90%', 
        border: '1px solid rgba(59, 91, 255, 0.08)',
        boxShadow: 'var(--shadow-xl)',
        zIndex: 10,
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white',
            width: '3rem',
            height: '3rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.5rem',
            marginBottom: '0.75rem',
            boxShadow: '0 8px 16px -4px rgba(59, 91, 255, 0.3)'
          }}>SB</div>
          <h1 className="text-gradient-blue" style={{ fontSize: '2rem', fontWeight: 800 }}>StitchBill</h1>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem', textAlign: 'center' }}>
            {isLogin ? 'Sign in to your corporate billing ledger' : 'Establish a new cloud tenant workspace'}
          </p>
        </div>

        {errorMsg && (
          <div className="badge badge-danger w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Sarah Jenkins" 
                value={name} 
                required
                onChange={e => setName(e.target.value)} 
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Corporate Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="owner@stitchbill.com" 
              value={email} 
              required
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Secure Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password} 
              required
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          <button className="btn btn-primary w-full mt-4" type="submit" disabled={isSaving} style={{ padding: '0.85rem' }}>
            {isSaving ? 'Processing Secure Session...' : isLogin ? 'Sign In to Dashboard' : 'Provision Tenant Account'}
          </button>
        </form>

        {isLogin && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-color)' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem', textAlign: 'center' }}>
              ⚡ Developer Testing Quick-Login
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => { setEmail('owner@stitchbill.com'); setPassword('password123'); }}
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: '#f8fafc', borderColor: 'rgba(59,91,255,0.1)' }}
              >
                👑 <strong>Owner Admin:</strong> owner@stitchbill.com
              </button>
              <button 
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => { setEmail('warehouse@stitchbill.com'); setPassword('password123'); }}
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: '#fffbeb', borderColor: 'rgba(217,119,6,0.1)' }}
              >
                📦 <strong>Warehouse Manager:</strong> warehouse@stitchbill.com
              </button>
              <button 
                type="button"
                className="btn btn-secondary w-full"
                onClick={() => { setEmail('cashier@stitchbill.com'); setPassword('password123'); }}
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem', background: '#ecfdf5', borderColor: 'rgba(4,120,87,0.1)' }}
              >
                🛒 <strong>Retail Cashier:</strong> cashier@stitchbill.com
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button className="btn btn-ghost w-full" style={{ fontSize: '0.85rem' }} onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}>
            {isLogin ? "New to StitchBill? Create an account" : "Already registered? Sign in to workspace"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== ONBOARDING PAGE ====================
const OnboardingPage = () => {
  const { onboardTenant } = useAuth();
  const [businessName, setBusinessName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [planType, setPlanType] = React.useState<'single_shop' | 'multi_branch'>('single_shop');
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName) {
      setErrorMsg('Please enter a business profile name.');
      return;
    }
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const branchSuffix = planType === 'multi_branch' ? 'HQ Central Warehouse' : 'Main Retail Branch';
      const res = await onboardTenant(businessName, planType, `${businessName} ${branchSuffix}`, '', phone);
      if (res?.error) {
        setErrorMsg(res.error.message || 'Onboarding failed due to database locks.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Onboarding system error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-container items-center justify-center animate-fade-in" style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="bg-grid-overlay"></div>
      <div className="glass-panel animate-fade-in" style={{ 
        padding: '3rem 2.5rem', 
        maxWidth: '520px', 
        width: '90%', 
        border: '1px solid rgba(59, 91, 255, 0.08)',
        boxShadow: 'var(--shadow-xl)',
        zIndex: 10,
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.25rem',
            boxShadow: '0 4px 12px -2px rgba(59, 91, 255, 0.25)'
          }}>SB</div>
          <div>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.6rem', fontWeight: 800 }}>Establish Business Profile</h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.1rem' }}>Welcome to StitchBill! Initialize your cloud tenant workspace.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="badge badge-danger w-full justify-center" style={{ padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Company / Brand Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Popai Boutiques" 
              value={businessName} 
              required
              onChange={e => setBusinessName(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="+1 (555) 000-0000" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Select Operation Plan</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
              <label style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                alignItems: 'flex-start', 
                fontSize: '0.875rem', 
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                background: planType === 'single_shop' ? 'var(--primary-glow)' : '#ffffff',
                borderColor: planType === 'single_shop' ? 'var(--primary)' : 'var(--border-color)'
              }}>
                <input type="radio" checked={planType === 'single_shop'} onChange={() => setPlanType('single_shop')} style={{ marginTop: '0.25rem' }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Single Shop Boutique</strong>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>One retail store branch and one unified inventory ledger catalog</p>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                alignItems: 'flex-start', 
                fontSize: '0.875rem', 
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                background: planType === 'multi_branch' ? 'var(--primary-glow)' : '#ffffff',
                borderColor: planType === 'multi_branch' ? 'var(--primary)' : 'var(--border-color)'
              }}>
                <input type="radio" checked={planType === 'multi_branch'} onChange={() => setPlanType('multi_branch')} style={{ marginTop: '0.25rem' }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>HQ Warehouse + POS Outlet Network</strong>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>Central supply warehouse and multiple independent checkout locations</p>
                </div>
              </label>
            </div>
          </div>

          <button className="btn btn-primary w-full mt-4" type="submit" disabled={isSaving || !businessName} style={{ padding: '0.85rem' }}>
            {isSaving ? 'Provisioning Workspace Cloud...' : 'Initialize & Open Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== DASHBOARD PORTAL SHELL ====================
const DashboardShell = () => {
  const { user, profile, tenant, shops, currentShop, setCurrentShop, logout } = useAuth();
  const location = useLocation();

  const getNavStyle = (path: string): React.CSSProperties => {
    const isActive = location.pathname === path;
    return isActive ? {
      background: 'var(--primary-glow)',
      color: 'var(--primary)',
      fontWeight: 700,
      borderLeft: '4px solid var(--primary)',
      borderRadius: '0 10px 10px 0',
      marginLeft: '-1.5rem',
      paddingLeft: '1.25rem',
      justifyContent: 'flex-start',
      boxShadow: 'none'
    } : {
      color: 'var(--text-secondary)',
      justifyContent: 'flex-start'
    };
  };

  const getInitials = (name: string) => {
    if (!name) return 'SB';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="glass-panel" style={{ 
        width: '260px', 
        borderRadius: '0', 
        borderLeft: 'none', 
        borderTop: 'none', 
        borderBottom: 'none', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem', 
        height: '100vh', 
        padding: '1.75rem 1.5rem',
        background: '#ffffff',
        position: 'relative',
        zIndex: 100
      }}>
        {/* Logo and Tenant corporate header */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.15rem',
            boxShadow: '0 4px 10px -2px rgba(59, 91, 255, 0.25)'
          }}>SB</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="text-gradient-blue" style={{ fontSize: '1.35rem', fontWeight: 800 }}>StitchBill</h2>
            <span className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginTop: '0.05rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {tenant?.name || 'Loading corporate...'}
            </span>
          </div>
        </div>

        {/* Dynamic Branch Selector (Only allowed for Tenant Owner) */}
        {shops.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <Store size={12} /> Active Location
            </label>
            {profile?.role === 'tenant_owner' ? (
              <div style={{ position: 'relative' }}>
                <select 
                  className="form-input w-full" 
                  value={currentShop?.id || ''} 
                  onChange={e => {
                    const target = shops.find(s => s.id === e.target.value);
                    if (target) setCurrentShop(target);
                  }}
                  style={{ 
                    padding: '0.5rem 2.25rem 0.5rem 0.75rem', 
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.is_warehouse ? '(HQ)' : ''}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{
                padding: '0.65rem 0.85rem',
                fontSize: '0.825rem',
                fontWeight: 700,
                borderRadius: '8px',
                background: currentShop?.is_warehouse ? 'var(--warning-glow)' : 'var(--primary-glow)',
                color: currentShop?.is_warehouse ? 'var(--warning)' : 'var(--primary)',
                border: '1px solid currentColor',
                opacity: 0.9,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Store size={14} /> {currentShop?.name || 'Assigned Branch'}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Sidebar Links Navigation (Warehouse HQ vs Retail Outlet Branch) */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
          <Link to="/" className="btn btn-ghost" style={getNavStyle('/')}>
            <LayoutDashboard size={18} /> Overview
          </Link>
          
          {currentShop?.is_warehouse ? (
            /* WAREHOUSE HQ MODE - Core Logistics & Flow Only */
            <>
              <Link to="/purchases" className="btn btn-ghost" style={getNavStyle('/purchases')}>
                <Truck size={18} /> Purchases & Logistics
              </Link>
              <Link to="/reports" className="btn btn-ghost" style={getNavStyle('/reports')}>
                <BarChart3 size={18} /> Flow & Reports
              </Link>
            </>
          ) : (
            /* RETAIL OUTLET BRANCH MODE - Billing, POS, Local Catalog & Expenses/Payroll */
            <>
              <Link to="/billing" className="btn btn-ghost" style={getNavStyle('/billing')}>
                <ShoppingBag size={18} /> POS Billing
              </Link>
              <Link to="/inventory" className="btn btn-ghost" style={getNavStyle('/inventory')}>
                <Package size={18} /> Inventory Catalog
              </Link>
              <Link to="/customers" className="btn btn-ghost" style={getNavStyle('/customers')}>
                <Users size={18} /> Customers Directory
              </Link>
              <Link to="/reports" className="btn btn-ghost" style={getNavStyle('/reports')}>
                <BarChart3 size={18} /> Expenses & Reports
              </Link>
            </>
          )}

          <Link to="/settings" className="btn btn-ghost" style={getNavStyle('/settings')}>
            <SettingsIcon size={18} /> Settings
          </Link>
        </nav>

        {/* User Footer Profile Card */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '2.5rem', 
              height: '2.5rem', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #3b5bff, #6366f1)', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 4px 8px -2px rgba(59, 91, 255, 0.2)'
            }}>
              {getInitials(profile?.full_name || user?.email || '')}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: '1.2' }}>
                {profile?.full_name || user?.email.split('@')[0]}
              </h4>
              <span className="badge badge-info" style={{ fontSize: '0.625rem', padding: '0.1rem 0.4rem', marginTop: '0.2rem', textTransform: 'capitalize' }}>
                {profile?.role?.replace('_', ' ') || 'Staff'}
              </span>
            </div>
          </div>
          <button className="btn btn-secondary w-full" onClick={logout} style={{ padding: '0.55rem', fontSize: '0.825rem', borderRadius: '8px' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Portal Content */}
      <main className="main-content" style={{ padding: '2rem 2.5rem' }}>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// ==================== ROUTE GUARDS ====================
const ProtectedRoute = ({ children, requireTenant = true }: { children: React.ReactNode, requireTenant?: boolean }) => {
  const { user, tenant, isLoading } = useAuth();
  const [showSlowMessage, setShowSlowMessage] = React.useState(false);

  React.useEffect(() => {
    let timer: any;
    if (isLoading) {
      timer = setTimeout(() => setShowSlowMessage(true), 5000);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="app-container items-center justify-center flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100vw', height: '100vh', background: 'var(--bg-color)' }}>
        <div className="spinner" style={{ width: '3.5rem', height: '3.5rem', borderWidth: '4px' }}></div>
        {showSlowMessage && (
          <div className="animate-fade-in text-center">
            <h3 className="text-gradient-blue mb-2" style={{ fontSize: '1.25rem' }}>Waking up database...</h3>
            <p className="text-secondary" style={{ maxWidth: '300px', fontSize: '0.875rem' }}>
              Your Supabase PostgreSQL database is starting up. This can take up to 60 seconds on the free tier.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireTenant && !tenant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, tenant } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/invoice/:token" element={<PublicInvoicePage />} />
      <Route path="/onboarding" element={
        <ProtectedRoute requireTenant={false}>
          {tenant ? <Navigate to="/" replace /> : <OnboardingPage />}
        </ProtectedRoute>
      } />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <DashboardShell />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
