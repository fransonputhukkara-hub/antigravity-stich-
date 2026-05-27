export interface Tenant {
  id: string;
  name: string;
  plan_type: 'single_shop' | 'multi_branch';
  subscription_status: string;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'super_admin' | 'tenant_owner' | 'branch_manager' | 'cashier' | 'staff';
  created_at: string;
  updated_at?: string;
}

export interface Shop {
  id: string;
  tenant_id: string;
  name: string;
  is_warehouse: boolean;
  address: string | null;
  phone: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  shop_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  buying_price: number;
  selling_price: number;
  quantity: number;
  min_quantity_alert: number;
  created_at: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  shop_id: string;
  customer_id: string | null;
  invoice_number: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'credit';
  status: 'paid' | 'pending' | 'cancelled';
  created_by: string;
  token: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SalesReturn {
  id: string;
  tenant_id: string;
  invoice_id: string;
  returned_by: string;
  refund_amount: number;
  reason: string | null;
  created_at: string;
}

export interface PurchaseEntry {
  id: string;
  tenant_id: string;
  shop_id: string;
  supplier_name: string;
  supplier_phone: string | null;
  total_amount: number;
  status: 'received' | 'pending' | 'cancelled';
  created_at: string;
}

export interface PurchaseReturn {
  id: string;
  tenant_id: string;
  purchase_entry_id: string;
  returned_amount: number;
  reason: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  tenant_id: string;
  company_name: string | null;
  currency: string;
  logo_url: string | null;
  whatsapp_template: string | null;
  tax_percentage: number;
  maps_link: string | null;
  instagram_username: string | null;
  facebook_username: string | null;
  updated_at?: string;
}
