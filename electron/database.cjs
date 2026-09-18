const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

let db = null;

function openDatabase(userDataPath) {
  if (db) return db;

  const dbPath = path.join(userDataPath, "foga.db");

  db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      category_id TEXT NOT NULL
        CHECK (category_id IN ('comidas', 'bebidas', 'otros')),
      active INTEGER NOT NULL
        CHECK (active IN (0, 1)),
      sort_order INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      opened_at INTEGER NOT NULL,
      closed_at INTEGER,
      label TEXT NOT NULL,
      mock INTEGER NOT NULL DEFAULT 0
        CHECK (mock IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      number INTEGER NOT NULL CHECK (number > 0),
      customer_name TEXT,
      total INTEGER NOT NULL CHECK (total >= 0),
      payment_method TEXT NOT NULL
        CHECK (payment_method IN ('efectivo', 'debito')),
      status TEXT NOT NULL
        CHECK (status IN ('confirmada', 'anulada')),
      created_at INTEGER NOT NULL,
      voided_at INTEGER,
      void_reason TEXT,
      printed INTEGER NOT NULL DEFAULT 0
        CHECK (printed IN (0, 1)),
      print_count INTEGER NOT NULL DEFAULT 0
        CHECK (print_count >= 0),
      mock INTEGER NOT NULL DEFAULT 0
        CHECK (mock IN (0, 1)),
      FOREIGN KEY (session_id)
        REFERENCES sessions(id)
        ON DELETE RESTRICT,
      UNIQUE (session_id, number)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      unit_price_snapshot INTEGER NOT NULL
        CHECK (unit_price_snapshot >= 0),
      quantity INTEGER NOT NULL
        CHECK (quantity > 0),
      line_total INTEGER NOT NULL
        CHECK (line_total >= 0),
      mock INTEGER NOT NULL DEFAULT 0
        CHECK (mock IN (0, 1)),
      FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY
        CHECK (id = 'settings'),
      pin_enabled INTEGER NOT NULL
        CHECK (pin_enabled IN (0, 1)),
      pin_code TEXT,
      ticket_width_mm INTEGER NOT NULL
        CHECK (ticket_width_mm IN (58, 80)),
      business_name TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_session
      ON orders(session_id);

    CREATE INDEX IF NOT EXISTS idx_order_items_order
      ON order_items(order_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_single_open_session
      ON sessions((1))
      WHERE closed_at IS NULL;
  `);

  db.prepare(`
    INSERT OR IGNORE INTO app_meta (key, value)
    VALUES ('schema_version', '1')
  `).run();

  console.log("[FOGA] SQLite:", dbPath);

  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function pingDatabase() {
  if (!db) {
    throw new Error("La base de datos no está abierta.");
  }

  const row = db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get("schema_version");

  return {
    ok: true,
    schemaVersion: row?.value ?? null,
  };
}

function inspectDatabase() {
  if (!db) {
    throw new Error("La base de datos no está abierta.");
  }

  const tables = db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    .all()
    .map((row) => row.name);

  return {
    ok: true,
    tables,
  };
}

module.exports = {
  openDatabase,
  closeDatabase,
  pingDatabase,
  inspectDatabase,
};