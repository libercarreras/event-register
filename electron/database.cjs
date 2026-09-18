const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

let db = null;

const DEFAULT_SETTINGS = {
  id: "settings",
  pinEnabled: false,
  pinCode: null,
  ticketWidthMm: 58,
  businessName: "FOGA Eventos",
};

const SEED_PRODUCTS = [
  ["Chorizo", 25000, "comidas"],
  ["Hamburguesa", 32000, "comidas"],
  ["Papas fritas", 18000, "comidas"],
  ["Coca-Cola", 12000, "bebidas"],
  ["Agua", 8000, "bebidas"],
  ["Cerveza", 20000, "bebidas"],
];

function requireDb() {
  if (!db) {
    throw new Error("La base de datos no está abierta.");
  }

  return db;
}

function bool(value) {
  return value ? 1 : 0;
}

function productFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    categoryId: row.category_id,
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sessionFromRow(row) {
  return {
    id: row.id,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    label: row.label,
    ...(row.mock ? { mock: true } : {}),
  };
}

function orderFromRow(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    number: row.number,
    customerName: row.customer_name,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    printed: Boolean(row.printed),
    printCount: row.print_count,
    ...(row.mock ? { mock: true } : {}),
  };
}

function orderItemFromRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    nameSnapshot: row.name_snapshot,
    unitPriceSnapshot: row.unit_price_snapshot,
    quantity: row.quantity,
    lineTotal: row.line_total,
    ...(row.mock ? { mock: true } : {}),
  };
}

function settingsFromRow(row) {
  return {
    id: "settings",
    pinEnabled: Boolean(row.pin_enabled),
    pinCode: row.pin_code,
    ticketWidthMm: row.ticket_width_mm,
    businessName: row.business_name,
  };
}

function sessionLabel(date) {
  return date.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
  const database = requireDb();

  const row = database
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get("schema_version");

  return {
    ok: true,
    schemaVersion: row?.value ?? null,
  };
}

function inspectDatabase() {
  const database = requireDb();

  const tables = database
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

function listProducts() {
  const database = requireDb();

  let rows = database
    .prepare("SELECT * FROM products ORDER BY sort_order ASC")
    .all();

  if (rows.length === 0) {
    const now = Date.now();

    const insert = database.prepare(`
      INSERT INTO products (
        id,
        name,
        price,
        category_id,
        active,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    database.exec("BEGIN IMMEDIATE");

    try {
      SEED_PRODUCTS.forEach(([name, price, categoryId], index) => {
        insert.run(
          randomUUID(),
          name,
          price,
          categoryId,
          1,
          index,
          now,
          now
        );
      });

      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    rows = database
      .prepare("SELECT * FROM products ORDER BY sort_order ASC")
      .all();
  }

  return rows.map(productFromRow);
}

function saveProduct(product) {
  const database = requireDb();

  database.prepare(`
    INSERT INTO products (
      id,
      name,
      price,
      category_id,
      active,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      price = excluded.price,
      category_id = excluded.category_id,
      active = excluded.active,
      sort_order = excluded.sort_order,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `).run(
    product.id,
    product.name,
    product.price,
    product.categoryId,
    bool(product.active),
    product.sortOrder,
    product.createdAt,
    product.updatedAt
  );
}

function getOpenSession() {
  const database = requireDb();

  const row = database
    .prepare(`
      SELECT *
      FROM sessions
      WHERE closed_at IS NULL
      ORDER BY opened_at DESC
      LIMIT 1
    `)
    .get();

  return row ? sessionFromRow(row) : null;
}

function listSessions() {
  return requireDb()
    .prepare("SELECT * FROM sessions ORDER BY opened_at DESC")
    .all()
    .map(sessionFromRow);
}

function openSession(label = "") {
  const database = requireDb();
  const existing = getOpenSession();

  if (existing) return existing;

  const now = Date.now();

  const session = {
    id: randomUUID(),
    openedAt: now,
    closedAt: null,
    label:
      typeof label === "string" && label.trim() !== ""
        ? label.trim()
        : sessionLabel(new Date(now)),
  };

  database.prepare(`
    INSERT INTO sessions (
      id,
      opened_at,
      closed_at,
      label,
      mock
    )
    VALUES (?, ?, NULL, ?, 0)
  `).run(session.id, session.openedAt, session.label);

  return session;
}

function closeSession(sessionId) {
  const database = requireDb();

  const row = database
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId);

  if (!row) {
    throw new Error("Jornada inexistente");
  }

  if (row.closed_at !== null) {
    return sessionFromRow(row);
  }

  const closedAt = Date.now();

  database
    .prepare("UPDATE sessions SET closed_at = ? WHERE id = ?")
    .run(closedAt, sessionId);

  return sessionFromRow({
    ...row,
    closed_at: closedAt,
  });
}

function nextOrderNumber(sessionId) {
  const row = requireDb()
    .prepare(`
      SELECT COALESCE(MAX(number), 0) + 1 AS next_number
      FROM orders
      WHERE session_id = ?
    `)
    .get(sessionId);

  return row.next_number;
}

function confirmSale(input) {
  const database = requireDb();

  if (!input || !Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error("El pedido está vacío");
  }

  database.exec("BEGIN IMMEDIATE");

  try {
    const sessionRow = database
      .prepare(`
        SELECT *
        FROM sessions
        WHERE closed_at IS NULL
        ORDER BY opened_at DESC
        LIMIT 1
      `)
      .get();

    if (!sessionRow) {
      throw new Error("No hay una jornada abierta");
    }

    const numberRow = database
      .prepare(`
        SELECT COALESCE(MAX(number), 0) + 1 AS next_number
        FROM orders
        WHERE session_id = ?
      `)
      .get(sessionRow.id);

    const orderId = randomUUID();

    const items = input.lines.map((line) => ({
      id: randomUUID(),
      orderId,
      productId: line.productId,
      nameSnapshot: line.name,
      unitPriceSnapshot: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.unitPrice * line.quantity,
    }));

    const order = {
      id: orderId,
      sessionId: sessionRow.id,
      number: numberRow.next_number,
      customerName:
        typeof input.customerName === "string" &&
        input.customerName.trim() !== ""
          ? input.customerName.trim()
          : null,
      total: items.reduce((sum, item) => sum + item.lineTotal, 0),
      paymentMethod: input.paymentMethod,
      status: "confirmada",
      createdAt: Date.now(),
      voidedAt: null,
      voidReason: null,
      printed: false,
      printCount: 0,
    };

    database.prepare(`
      INSERT INTO orders (
        id,
        session_id,
        number,
        customer_name,
        total,
        payment_method,
        status,
        created_at,
        voided_at,
        void_reason,
        printed,
        print_count,
        mock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, 0, 0)
    `).run(
      order.id,
      order.sessionId,
      order.number,
      order.customerName,
      order.total,
      order.paymentMethod,
      order.status,
      order.createdAt
    );

    const insertItem = database.prepare(`
      INSERT INTO order_items (
        id,
        order_id,
        product_id,
        name_snapshot,
        unit_price_snapshot,
        quantity,
        line_total,
        mock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    for (const item of items) {
      insertItem.run(
        item.id,
        item.orderId,
        item.productId,
        item.nameSnapshot,
        item.unitPriceSnapshot,
        item.quantity,
        item.lineTotal
      );
    }

    database.exec("COMMIT");

    return {
      order,
      items,
    };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function listOrders(sessionId) {
  return requireDb()
    .prepare(`
      SELECT *
      FROM orders
      WHERE session_id = ?
      ORDER BY number DESC
    `)
    .all(sessionId)
    .map(orderFromRow);
}

function listOrderItems(orderId) {
  return requireDb()
    .prepare(`
      SELECT *
      FROM order_items
      WHERE order_id = ?
    `)
    .all(orderId)
    .map(orderItemFromRow);
}

function markPrinted(orderId, ok) {
  const database = requireDb();

  const row = database
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId);

  if (!row) {
    throw new Error("Pedido inexistente");
  }

  if (ok) {
    database.prepare(`
      UPDATE orders
      SET printed = 1,
          print_count = print_count + 1
      WHERE id = ?
    `).run(orderId);
  }

  const updated = database
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId);

  return orderFromRow(updated);
}

function voidOrder(orderId, reason) {
  const database = requireDb();

  const row = database
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId);

  if (!row) {
    throw new Error("Pedido inexistente");
  }

  database.prepare(`
    UPDATE orders
    SET status = 'anulada',
        voided_at = ?,
        void_reason = ?
    WHERE id = ?
  `).run(Date.now(), reason ?? null, orderId);

  return orderFromRow(
    database.prepare("SELECT * FROM orders WHERE id = ?").get(orderId)
  );
}

function sessionTotals(sessionId) {
  const database = requireDb();

  const totals = database.prepare(`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN status = 'confirmada'
             AND payment_method = 'efectivo'
            THEN total
            ELSE 0
          END
        ),
        0
      ) AS efectivo,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'confirmada'
             AND payment_method = 'debito'
            THEN total
            ELSE 0
          END
        ),
        0
      ) AS debito,

      COALESCE(
        SUM(
          CASE
            WHEN status = 'confirmada'
            THEN total
            ELSE 0
          END
        ),
        0
      ) AS total,

      SUM(
        CASE
          WHEN status = 'confirmada'
          THEN 1
          ELSE 0
        END
      ) AS orders,

      SUM(
        CASE
          WHEN status = 'anulada'
          THEN 1
          ELSE 0
        END
      ) AS anuladas

    FROM orders
    WHERE session_id = ?
  `).get(sessionId);

  return {
    efectivo: totals.efectivo ?? 0,
    debito: totals.debito ?? 0,
    total: totals.total ?? 0,
    orders: totals.orders ?? 0,
    anuladas: totals.anuladas ?? 0,
  };
}

function getSettings() {
  const database = requireDb();

  let row = database
    .prepare("SELECT * FROM settings WHERE id = 'settings'")
    .get();

  if (!row) {
    saveSettings(DEFAULT_SETTINGS);

    row = database
      .prepare("SELECT * FROM settings WHERE id = 'settings'")
      .get();
  }

  return settingsFromRow(row);
}

function saveSettings(settings) {
  requireDb().prepare(`
    INSERT INTO settings (
      id,
      pin_enabled,
      pin_code,
      ticket_width_mm,
      business_name
    )
    VALUES ('settings', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      pin_enabled = excluded.pin_enabled,
      pin_code = excluded.pin_code,
      ticket_width_mm = excluded.ticket_width_mm,
      business_name = excluded.business_name
  `).run(
    bool(settings.pinEnabled),
    settings.pinCode ?? null,
    settings.ticketWidthMm,
    settings.businessName
  );
}

function exportBackup() {
  const database = requireDb();

  return {
    format: "foga-eventos-backup",
    version: 1,
    createdAt: Date.now(),
    products: database
      .prepare("SELECT * FROM products ORDER BY sort_order ASC")
      .all()
      .map(productFromRow),
    sessions: database
      .prepare("SELECT * FROM sessions ORDER BY opened_at DESC")
      .all()
      .map(sessionFromRow),
    orders: database
      .prepare("SELECT * FROM orders")
      .all()
      .map(orderFromRow),
    orderItems: database
      .prepare("SELECT * FROM order_items")
      .all()
      .map(orderItemFromRow),
    settings: getSettings(),
  };
}

function importBackup(backup) {
  const database = requireDb();

  if (
    !backup ||
    backup.format !== "foga-eventos-backup" ||
    backup.version !== 1 ||
    !Array.isArray(backup.products) ||
    !Array.isArray(backup.sessions) ||
    !Array.isArray(backup.orders) ||
    !Array.isArray(backup.orderItems) ||
    typeof backup.settings !== "object" ||
    backup.settings === null
  ) {
    throw new Error("Respaldo FOGA inválido.");
  }

  database.exec("BEGIN IMMEDIATE");

  try {
    database.exec(`
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM sessions;
      DELETE FROM products;
      DELETE FROM settings;
    `);

    const insertProduct = database.prepare(`
      INSERT INTO products (
        id,
        name,
        price,
        category_id,
        active,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const product of backup.products) {
      insertProduct.run(
        product.id,
        product.name,
        product.price,
        product.categoryId,
        bool(product.active),
        product.sortOrder,
        product.createdAt,
        product.updatedAt
      );
    }

    const insertSession = database.prepare(`
      INSERT INTO sessions (
        id,
        opened_at,
        closed_at,
        label,
        mock
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const session of backup.sessions) {
      insertSession.run(
        session.id,
        session.openedAt,
        session.closedAt ?? null,
        session.label,
        bool(session.mock)
      );
    }

    const insertOrder = database.prepare(`
      INSERT INTO orders (
        id,
        session_id,
        number,
        customer_name,
        total,
        payment_method,
        status,
        created_at,
        voided_at,
        void_reason,
        printed,
        print_count,
        mock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const order of backup.orders) {
      insertOrder.run(
        order.id,
        order.sessionId,
        order.number,
        order.customerName ?? null,
        order.total,
        order.paymentMethod,
        order.status,
        order.createdAt,
        order.voidedAt ?? null,
        order.voidReason ?? null,
        bool(order.printed),
        order.printCount,
        bool(order.mock)
      );
    }

    const insertItem = database.prepare(`
      INSERT INTO order_items (
        id,
        order_id,
        product_id,
        name_snapshot,
        unit_price_snapshot,
        quantity,
        line_total,
        mock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of backup.orderItems) {
      insertItem.run(
        item.id,
        item.orderId,
        item.productId,
        item.nameSnapshot,
        item.unitPriceSnapshot,
        item.quantity,
        item.lineTotal,
        bool(item.mock)
      );
    }

    saveSettings({
      ...backup.settings,
      id: "settings",
    });

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

module.exports = {
  openDatabase,
  closeDatabase,
  pingDatabase,
  inspectDatabase,

  listProducts,
  saveProduct,

  getOpenSession,
  listSessions,
  openSession,
  closeSession,

  nextOrderNumber,
  confirmSale,
  listOrders,
  listOrderItems,
  markPrinted,
  voidOrder,
  sessionTotals,

  getSettings,
  saveSettings,

  exportBackup,
  importBackup,
};