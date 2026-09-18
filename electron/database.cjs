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

module.exports = {
  openDatabase,
  closeDatabase,
};