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

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    cost_price NUMERIC NOT NULL,
    retail_price NUMERIC NOT NULL,
    wholesale_price NUMERIC NOT NULL,
    buying_price_per_carton NUMERIC DEFAULT 0,
    margin NUMERIC DEFAULT 0,
    wholesale_margin NUMERIC DEFAULT 0,
    wholesale_unit_size INTEGER NOT NULL,
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

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    payment_mode TEXT
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    transport_cost NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    discount_type TEXT,
    tax_amount NUMERIC DEFAULT 0,
    total_cost NUMERIC NOT NULL,
    timestamp TEXT NOT NULL,
    payment_status TEXT,
    payment_mode TEXT,
    order_type TEXT,
    status TEXT,
    destination_address TEXT,
    driver_name TEXT,
    vehicle TEXT
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT,
    sale_price NUMERIC NOT NULL,
    cost_price NUMERIC NOT NULL,
    timestamp TEXT NOT NULL,
    discount_amount NUMERIC DEFAULT 0,
    discount_type TEXT,
    batch_id TEXT,
    payment_mode TEXT,
    order_id TEXT
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    expected_delivery TEXT
);

-- Inventory Adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    timestamp TEXT NOT NULL,
    user_name TEXT,
    amount NUMERIC
);
