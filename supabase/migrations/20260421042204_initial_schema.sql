/*
  # Initial Schema for B-Hub Beverage Management App

  1. New Tables
    - `users` - User profiles with roles (client/manager), business info, VAT settings
    - `products` - Beverage product catalog with pricing, stock, batches
    - `customers` - Customer records with contact info and debt tracking
    - `vendors` - Supplier/vendor records
    - `expenses` - Business expense records
    - `orders` - Customer order records with items, costs, delivery info
    - `sales` - Individual sale transaction records
    - `purchase_orders` - Purchase orders to vendors
    - `inventory_adjustments` - Stock adjustment audit log

  2. Security
    - RLS enabled on all tables
    - Users can read/update their own profile
    - All other tables are scoped to company_id matching the authenticated user's uid
    - Separate policies for SELECT, INSERT, UPDATE, DELETE

  3. Notes
    - company_id in all business tables references the owner user's uid
    - JSONB used for items arrays and product batches
    - Text used for IDs to support existing client-side generated IDs
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT,
    role TEXT CHECK (role IN ('client', 'manager')),
    company_id TEXT,
    phone TEXT,
    business_name TEXT,
    address TEXT,
    tin_number TEXT,
    city_state TEXT,
    postal_code TEXT,
    is_vat_applicable BOOLEAN DEFAULT FALSE,
    vat_rate NUMERIC DEFAULT 18,
    include_receivable_in_revenue BOOLEAN DEFAULT FALSE
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid OR auth.uid()::text = company_id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = uid);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = uid)
  WITH CHECK (auth.uid()::text = uid);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    retail_price NUMERIC NOT NULL DEFAULT 0,
    wholesale_price NUMERIC NOT NULL DEFAULT 0,
    buying_price_per_carton NUMERIC DEFAULT 0,
    margin NUMERIC DEFAULT 0,
    wholesale_margin NUMERIC DEFAULT 0,
    wholesale_unit_size INTEGER NOT NULL DEFAULT 1,
    stock INTEGER DEFAULT 0,
    num_cartons INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    barcode TEXT,
    image TEXT,
    discount TEXT,
    expiry_date TEXT,
    batch_number TEXT,
    description TEXT,
    featured BOOLEAN DEFAULT FALSE,
    batches JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view products"
  ON products FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    debt NUMERIC DEFAULT 0
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city_state TEXT,
    postal_code TEXT,
    category TEXT
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    payment_mode TEXT
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    transport_cost NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    discount_type TEXT,
    tax_amount NUMERIC DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    payment_status TEXT,
    payment_mode TEXT,
    order_type TEXT,
    status TEXT,
    destination_address TEXT,
    driver_name TEXT,
    vehicle TEXT
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    type TEXT,
    sale_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    discount_amount NUMERIC DEFAULT 0,
    discount_type TEXT,
    batch_id TEXT,
    payment_mode TEXT,
    order_id TEXT
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    date TEXT NOT NULL,
    expected_delivery TEXT
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Inventory Adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    timestamp TEXT NOT NULL,
    user_name TEXT,
    amount NUMERIC DEFAULT 0
);

ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view inventory adjustments"
  ON inventory_adjustments FOR SELECT
  TO authenticated
  USING (company_id = auth.uid()::text);

CREATE POLICY "Company members can insert inventory adjustments"
  ON inventory_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can update inventory adjustments"
  ON inventory_adjustments FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid()::text)
  WITH CHECK (company_id = auth.uid()::text);

CREATE POLICY "Company members can delete inventory adjustments"
  ON inventory_adjustments FOR DELETE
  TO authenticated
  USING (company_id = auth.uid()::text);

-- Indexes for performance on common query patterns
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_company_id ON inventory_adjustments(company_id);
