import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect Mock Mode
export const isMockMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('placeholder') || 
  supabaseUrl === 'YOUR_SUPABASE_URL';

const realSupabase = !isMockMode 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (isMockMode) {
  console.warn(
    '⚠️ StitchBill: Running in stateful in-memory MOCK mode. All features will be active, but changes will not persist across page refreshes.'
  );
}

// ---------------------------------------------------------
// STATEFUL IN-MEMORY MOCK DATABASE
// ---------------------------------------------------------
const mockDb: {
  tenants: any[];
  profiles: any[];
  user_roles: any[];
  shops: any[];
  customers: any[];
  inventory: any[];
  invoices: any[];
  invoice_items: any[];
  sales_returns: any[];
  purchase_entries: any[];
  purchase_returns: any[];
  settings: any[];
  expenses: any[];
} = {
  tenants: [],
  profiles: [],
  user_roles: [],
  shops: [],
  customers: [],
  inventory: [],
  invoices: [],
  invoice_items: [],
  sales_returns: [],
  purchase_entries: [],
  purchase_returns: [],
  settings: [],
  expenses: [],
};

// Seed Mock Data with high-fidelity realistic retail inventory, shops, customers
const seedMockData = () => {
  const tId = 'mock-tenant-id-123';
  
  // 1. Tenant
  mockDb.tenants.push({
    id: tId,
    name: 'Sarah Apparel Ltd',
    plan_type: 'multi_branch',
    subscription_status: 'active',
    created_at: new Date().toISOString(),
  });

  // 2. Profile
  mockDb.profiles.push({
    id: 'mock-user-owner-123',
    tenant_id: tId,
    email: 'owner@stitchbill.com',
    full_name: 'Sarah Jenkins',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'tenant_owner',
    created_at: new Date().toISOString(),
  });

  // 3. User Role
  mockDb.user_roles.push({
    id: 'mock-role-1',
    tenant_id: tId,
    profile_id: 'mock-user-owner-123',
    role: 'tenant_owner',
    created_at: new Date().toISOString(),
  });

  // 4. Shops (1 Central Warehouse, 2 Shops)
  const warehouseId = 'mock-shop-warehouse';
  const shopAId = 'mock-shop-a';
  const shopBId = 'mock-shop-b';

  mockDb.shops.push(
    {
      id: warehouseId,
      tenant_id: tId,
      name: 'Central Warehouse (HQ)',
      is_warehouse: true,
      address: '100 Logistics Blvd, Suite A',
      phone: '+1 (555) 123-4560',
      created_at: new Date().toISOString(),
    },
    {
      id: shopAId,
      tenant_id: tId,
      name: 'Uptown Boutique Branch',
      is_warehouse: false,
      address: '450 Fashion Ave',
      phone: '+1 (555) 123-4561',
      created_at: new Date().toISOString(),
    },
    {
      id: shopBId,
      tenant_id: tId,
      name: 'Downtown POS Outlet',
      is_warehouse: false,
      address: '12 Broadway St',
      phone: '+1 (555) 123-4562',
      created_at: new Date().toISOString(),
    }
  );

  // 5. Settings
  mockDb.settings.push({
    id: 'mock-settings-id',
    tenant_id: tId,
    company_name: 'Sarah Apparel Ltd',
    currency: 'USD',
    logo_url: null,
    whatsapp_template: `╔══════════════════╗\n🧾 *STITCH BILL*\n╚══════════════════╝\n\n👤 *Customer*: {customer}\n🧾 *Invoice*: {invoice}\n\n📦 *Items*:\n{items}\n\n💰 *Total*: {total}\n\n🌐 *View Invoice*:\n{invoice_link}`,
    tax_percentage: 8.00,
    maps_link: 'https://maps.google.com/?cid=stitchbill',
    instagram_username: 'sarah_fashion',
    facebook_username: 'sarahapparel',
    updated_at: new Date().toISOString(),
  });

  // 6. Streamlined Customers
  const customer1 = 'mock-cust-1';
  const customer2 = 'mock-cust-2';
  mockDb.customers.push(
    {
      id: customer1,
      tenant_id: tId,
      name: 'David Miller',
      phone: '+1 (555) 987-6543',
      created_at: new Date().toISOString(),
    },
    {
      id: customer2,
      tenant_id: tId,
      name: 'Elena Rostova',
      phone: '+1 (555) 765-4321',
      created_at: new Date().toISOString(),
    }
  );

  // 7. Inventory Items
  mockDb.inventory.push(
    // Warehouse Inventory
    {
      id: 'mock-inv-wh-1',
      tenant_id: tId,
      shop_id: warehouseId,
      name: 'Premium Denim Jacket',
      sku: 'DENIM-JKT-001',
      barcode: '880192837101',
      buying_price: 32.50,
      selling_price: 79.99,
      quantity: 120,
      min_quantity_alert: 15,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-inv-wh-2',
      tenant_id: tId,
      shop_id: warehouseId,
      name: 'Linen Classic Shirt',
      sku: 'LINEN-SRT-002',
      barcode: '880192837102',
      buying_price: 18.00,
      selling_price: 45.00,
      quantity: 250,
      min_quantity_alert: 25,
      created_at: new Date().toISOString(),
    },
    // Shop A Inventory (Boutique)
    {
      id: 'mock-inv-sa-1',
      tenant_id: tId,
      shop_id: shopAId,
      name: 'Premium Denim Jacket',
      sku: 'DENIM-JKT-001',
      barcode: '880192837101',
      buying_price: 32.50,
      selling_price: 79.99,
      quantity: 18,
      min_quantity_alert: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-inv-sa-2',
      tenant_id: tId,
      shop_id: shopAId,
      name: 'Linen Classic Shirt',
      sku: 'LINEN-SRT-002',
      barcode: '880192837102',
      buying_price: 18.00,
      selling_price: 45.00,
      quantity: 35,
      min_quantity_alert: 8,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-inv-sa-3',
      tenant_id: tId,
      shop_id: shopAId,
      name: 'Staple White Cotton Tee',
      sku: 'TEE-WHT-003',
      barcode: '880192837103',
      buying_price: 6.50,
      selling_price: 24.99,
      quantity: 4, // low stock!
      min_quantity_alert: 10,
      created_at: new Date().toISOString(),
    }
  );

  // 8. Sales Invoices
  const inv1Id = 'mock-invoice-1001';
  mockDb.invoices.push({
    id: inv1Id,
    tenant_id: tId,
    shop_id: shopAId,
    customer_id: customer1,
    invoice_number: 'INV-2026-0001',
    total_amount: 140.70,
    tax_amount: 10.72,
    discount_amount: 0.00,
    payment_method: 'cash',
    status: 'paid',
    created_by: 'mock-user-owner-123',
    token: 'd7aE8c2B9F4a',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hrs ago
  });

  // 9. Invoice Items
  mockDb.invoice_items.push(
    {
      id: 'mock-inv-item-1',
      tenant_id: tId,
      invoice_id: inv1Id,
      inventory_id: 'mock-inv-sa-1', // Jacket
      quantity: 1,
      unit_price: 79.99,
      total_price: 79.99,
    },
    {
      id: 'mock-inv-item-2',
      tenant_id: tId,
      invoice_id: inv1Id,
      inventory_id: 'mock-inv-sa-3', // Tee
      quantity: 2,
      unit_price: 24.99,
      total_price: 49.98,
    }
  );

  // 10. Purchase Entries (Replenishments)
  const pur1Id = 'mock-pur-1001';
  mockDb.purchase_entries.push({
    id: pur1Id,
    tenant_id: tId,
    shop_id: warehouseId,
    supplier_name: 'Logistics Fabric Inc',
    supplier_phone: '+1 (555) 321-7654',
    total_amount: 650.00,
    status: 'received',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
  });

  // 11. Operating Expenses
  mockDb.expenses.push(
    {
      id: 'mock-exp-1',
      tenant_id: tId,
      shop_id: shopAId,
      category: 'Rent',
      amount: 150.00,
      description: 'Rent contribution for Uptown Boutique outlet space',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'mock-exp-2',
      tenant_id: tId,
      shop_id: shopAId,
      category: 'Electricity',
      amount: 45.00,
      description: 'Electricity grid utility contribution',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    }
  );
};

seedMockData();

// Simulated Net Latency
const delay = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

let currentSessionUser: any = mockDb.profiles[0];

export const mockSupabase = {
  auth: {
    getSession: async () => {
      await delay(50);
      return { data: { session: currentSessionUser ? { user: { id: currentSessionUser.id, email: currentSessionUser.email } } : null }, error: null };
    },
    getUser: async () => {
      await delay(50);
      return { data: { user: currentSessionUser ? { id: currentSessionUser.id, email: currentSessionUser.email, user_metadata: { full_name: currentSessionUser.full_name } } : null }, error: null };
    },
    signUp: async ({ email, password, options }: any) => {
      await delay(300);
      const emailLower = email.toLowerCase();
      const existing = mockDb.profiles.find(p => p.email.toLowerCase() === emailLower);
      if (existing) {
        return { data: null, error: { message: 'User already exists' } };
      }

      const mockUserId = `mock-user-${Math.random().toString(36).substr(2, 9)}`;
      const newProfile = {
        id: mockUserId,
        tenant_id: null,
        email: emailLower,
        full_name: options?.data?.full_name || emailLower.split('@')[0],
        avatar_url: null,
        role: 'tenant_owner',
        created_at: new Date().toISOString(),
      };
      
      mockDb.profiles.push(newProfile);
      currentSessionUser = newProfile;

      return {
        data: {
          user: { id: mockUserId, email: emailLower },
          session: { access_token: 'mock-token', user: { id: mockUserId, email: emailLower } }
        },
        error: null
      };
    },
    signInWithPassword: async ({ email, password }: any) => {
      await delay(300);
      const emailLower = email.toLowerCase();
      let profile = mockDb.profiles.find(p => p.email.toLowerCase() === emailLower);
      
      if (!profile) {
        // Auto-create on the fly in mock mode for review
        const mockUserId = `mock-user-${Math.random().toString(36).substr(2, 9)}`;
        profile = {
          id: mockUserId,
          tenant_id: null,
          email: emailLower,
          full_name: emailLower.split('@')[0],
          avatar_url: null,
          role: 'tenant_owner',
          created_at: new Date().toISOString(),
        };
        mockDb.profiles.push(profile);
      }
      
      currentSessionUser = profile;
      return { data: { user: { id: profile.id, email: profile.email }, session: { user: { id: profile.id, email: profile.email } } }, error: null };
    },
    signOut: async () => {
      await delay(50);
      currentSessionUser = null;
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },

  from: (table: keyof typeof mockDb) => {
    return {
      select: (columns: string = '*') => {
        let queryData = [...mockDb[table]];
        
        // Context filtering
        if (currentSessionUser?.tenant_id) {
          const tId = currentSessionUser.tenant_id;
          if (table !== 'profiles' && table !== 'tenants' && queryData.length > 0 && 'tenant_id' in queryData[0]) {
            queryData = queryData.filter(row => row.tenant_id === tId);
          }
          if (table === 'profiles') {
            queryData = queryData.filter(row => row.tenant_id === tId || row.id === currentSessionUser.id);
          }
          if (table === 'tenants') {
            queryData = queryData.filter(row => row.id === tId);
          }
        }

        const chain = {
          eq: (column: string, value: any) => {
            queryData = queryData.filter(row => row[column] === value);
            return chain;
          },
          order: (column: string, { ascending = true } = {}) => {
            queryData.sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (typeof valA === 'string') return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
              return ascending ? valA - valB : valB - valA;
            });
            return chain;
          },
          single: async () => {
            await delay(50);
            if (queryData.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
            return { data: queryData[0], error: null };
          },
          then: async (onfulfilled: any) => {
            await delay(50);
            return onfulfilled({ data: queryData, error: null });
          }
        };

        return chain;
      },

      insert: (rows: any | any[]) => {
        const rowsArray = Array.isArray(rows) ? rows : [rows];
        const insertedRows: any[] = [];
        
        rowsArray.forEach(row => {
          const newRow = {
            id: row.id || `mock-${table.substr(0, 3)}-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            ...row,
          };
          
          if (currentSessionUser?.tenant_id && ('tenant_id' in (mockDb[table]?.[0] || {}) || table !== 'profiles' && table !== 'tenants')) {
            newRow.tenant_id = currentSessionUser.tenant_id;
          }

          mockDb[table].push(newRow);
          insertedRows.push(newRow);

          // Auto trigger handles new tenant settings
          if (table === 'tenants') {
            mockDb.settings.push({
              id: `mock-set-${Math.random().toString(36).substr(2, 9)}`,
              tenant_id: newRow.id,
              company_name: newRow.name,
              currency: 'USD',
              logo_url: null,
              whatsapp_template: `🧾 *STITCH BILL* \nInvoice: {invoice}\nTotal: {total}\nLink: {invoice_link}`,
              tax_percentage: 5.0,
              updated_at: new Date().toISOString(),
            });
          }
        });

        const chain = {
          select: () => {
            return {
              single: async () => {
                await delay(50);
                return { data: insertedRows[0], error: null };
              },
              then: async (onfulfilled: any) => {
                await delay(50);
                return onfulfilled({ data: insertedRows, error: null });
              }
            };
          },
          then: async (onfulfilled: any) => {
            await delay(50);
            return onfulfilled({ data: insertedRows, error: null });
          }
        };

        return chain;
      },

      update: (updates: any) => {
        let targets: any[] = [];
        const chain = {
          eq: (column: string, value: any) => {
            mockDb[table] = mockDb[table].map(row => {
              if (row[column] === value) {
                const updatedRow = { ...row, ...updates, updated_at: new Date().toISOString() };
                targets.push(updatedRow);
                
                if (table === 'profiles' && row.id === currentSessionUser?.id) {
                  currentSessionUser = updatedRow;
                }
                return updatedRow;
              }
              return row;
            });
            return chain;
          },
          select: () => {
            return {
              then: async (onfulfilled: any) => {
                await delay(50);
                return onfulfilled({ data: targets, error: null });
              }
            };
          },
          then: async (onfulfilled: any) => {
            await delay(50);
            return onfulfilled({ data: targets, error: null });
          }
        };
        return chain;
      },

      delete: () => {
        let removed: any[] = [];
        const chain = {
          eq: (column: string, value: any) => {
            removed = mockDb[table].filter(row => row[column] === value);
            mockDb[table] = mockDb[table].filter(row => row[column] !== value);
            return chain;
          },
          then: async (onfulfilled: any) => {
            await delay(50);
            return onfulfilled({ data: removed, error: null });
          }
        };
        return chain;
      }
    };
  }
};

export const supabase = (isMockMode ? mockSupabase : realSupabase) as any;
export default supabase;
