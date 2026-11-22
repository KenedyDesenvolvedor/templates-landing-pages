CREATE TABLE IF NOT EXISTS brasa_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  order_type TEXT NOT NULL CHECK (order_type IN ('table', 'pickup')),
  table_no INTEGER CHECK (table_no IS NULL OR table_no BETWEEN 1 AND 12),
  customer_name TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('customer', 'staff')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served', 'closed', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS brasa_orders_status_created ON brasa_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS brasa_orders_table_status ON brasa_orders(table_no, status);
CREATE TABLE IF NOT EXISTS brasa_staff_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS brasa_staff_sessions_expiry ON brasa_staff_sessions(expires_at);
CREATE TABLE IF NOT EXISTS brasa_auth_attempts (
  ip_hash TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS brasa_auth_attempts_ip_time ON brasa_auth_attempts(ip_hash, attempted_at);
