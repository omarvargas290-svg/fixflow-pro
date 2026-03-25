const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function createPersistence({ root, defaultUsers, userStoreTemplate }) {
  const dataDir = path.join(root, "data");
  const storesDir = path.join(dataDir, "stores");
  const usersFile = path.join(dataDir, "users.json");
  const dbFile = path.join(dataDir, "fixflow.sqlite");
  let db = null;

  function ensureDirectories() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(storesDir)) fs.mkdirSync(storesDir, { recursive: true });
  }

  function openDb() {
    if (db) return db;
    ensureDirectories();
    db = new DatabaseSync(dbFile);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        password TEXT,
        password_hash TEXT,
        password_salt TEXT,
        password_updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS stores (
        owner_user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    return db;
  }

  function transaction(callback) {
    const database = openDb();
    database.exec("BEGIN");
    try {
      const result = callback(database);
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  function readUsersFromJson() {
    if (!fs.existsSync(usersFile)) return structuredClone(defaultUsers);
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
  }

  function readStoreFromJson(userId) {
    const file = path.join(storesDir, `${userId}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  function mapUserRow(row) {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      active: Boolean(row.active),
      password: row.password || undefined,
      passwordHash: row.password_hash || undefined,
      passwordSalt: row.password_salt || undefined,
      passwordUpdatedAt: row.password_updated_at || undefined
    };
  }

  function upsertUser(database, user) {
    database.prepare(`
      INSERT INTO users (
        id,
        name,
        role,
        email,
        active,
        password,
        password_hash,
        password_salt,
        password_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        email = excluded.email,
        active = excluded.active,
        password = excluded.password,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        password_updated_at = excluded.password_updated_at
    `).run(
      user.id,
      user.name,
      user.role,
      user.email,
      user.active ? 1 : 0,
      user.password || null,
      user.passwordHash || null,
      user.passwordSalt || null,
      user.passwordUpdatedAt || null
    );
  }

  function upsertStore(database, userId, data) {
    database.prepare(`
      INSERT INTO stores (owner_user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(owner_user_id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(data), new Date().toISOString());
  }

  function setMeta(database, key, value) {
    database.prepare(`
      INSERT INTO meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }

  function seedFromJsonIfNeeded() {
    const database = openDb();
    const row = database.prepare("SELECT COUNT(*) AS count FROM users").get();
    if (row.count > 0) return;

    const registry = readUsersFromJson();
    transaction((tx) => {
      setMeta(tx, "defaultUserId", registry.defaultUserId || defaultUsers.defaultUserId);
      for (const user of registry.users) {
        upsertUser(tx, user);
        const store = readStoreFromJson(user.id) || userStoreTemplate(user);
        upsertStore(tx, user.id, store);
      }
    });
  }

  function ensureStoresForKnownUsers() {
    const database = openDb();
    const users = database.prepare("SELECT id, name, role, email, active FROM users ORDER BY id").all();
    const missing = database.prepare(`
      SELECT users.id, users.name, users.role, users.email, users.active
      FROM users
      LEFT JOIN stores ON stores.owner_user_id = users.id
      WHERE stores.owner_user_id IS NULL
      ORDER BY users.id
    `).all();
    if (!users.length || !missing.length) return;
    transaction((tx) => {
      for (const user of missing) {
        const store = readStoreFromJson(user.id) || userStoreTemplate(mapUserRow(user));
        upsertStore(tx, user.id, store);
      }
    });
  }

  function ensureData() {
    openDb();
    seedFromJsonIfNeeded();
    ensureStoresForKnownUsers();
  }

  function readUsers() {
    ensureData();
    const database = openDb();
    const meta = database.prepare("SELECT value FROM meta WHERE key = ?").get("defaultUserId");
    const users = database.prepare("SELECT * FROM users ORDER BY id").all().map(mapUserRow);
    return {
      defaultUserId: meta ? meta.value : defaultUsers.defaultUserId,
      users
    };
  }

  function writeUsers(registry) {
    ensureData();
    transaction((tx) => {
      tx.prepare("DELETE FROM users").run();
      setMeta(tx, "defaultUserId", registry.defaultUserId || defaultUsers.defaultUserId);
      for (const user of registry.users) upsertUser(tx, user);
    });
  }

  function readStore(userId) {
    ensureData();
    const database = openDb();
    const row = database.prepare("SELECT data FROM stores WHERE owner_user_id = ?").get(userId);
    return row ? JSON.parse(row.data) : null;
  }

  function writeStore(userId, data) {
    ensureData();
    transaction((tx) => {
      upsertStore(tx, userId, data);
    });
  }

  function deleteStore(userId) {
    ensureData();
    openDb().prepare("DELETE FROM stores WHERE owner_user_id = ?").run(userId);
  }

  return {
    dbFile,
    ensureData,
    readUsers,
    writeUsers,
    readStore,
    writeStore,
    deleteStore
  };
}

module.exports = { createPersistence };
