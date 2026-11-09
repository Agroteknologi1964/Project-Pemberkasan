// Penyimpanan data: SQLite bawaan Node (node:sqlite) — tanpa compiler/native module.
// Butuh Node >= 22.5.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "pemberkasan.db");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    parent_id  INTEGER REFERENCES folders(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    folder_id   INTEGER REFERENCES folders(id) ON DELETE RESTRICT,
    stored_name TEXT NOT NULL,
    mime        TEXT,
    size        INTEGER NOT NULL DEFAULT 0,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
  CREATE INDEX IF NOT EXISTS idx_files_folder   ON files(folder_id);
`);

// --- Data awal hanya dibuat sekali, saat database masih kosong ---
const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;

if (userCount === 0) {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin#2026";
  const userPassword = process.env.SEED_USER_PASSWORD || "Budi#2026";

  const insertUser = db.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
  );
  insertUser.run("admin", bcrypt.hashSync(adminPassword, 10), "admin");
  insertUser.run("budi", bcrypt.hashSync(userPassword, 10), "user");

  const insertFolder = db.prepare(
    "INSERT INTO folders (name, parent_id) VALUES (?, ?)"
  );
  const umum = insertFolder.run("Berkas Umum", null).lastInsertRowid;
  insertFolder.run("Dokumen Pendaftaran", umum);
  insertFolder.run("Berkas Pendukung", null);

  console.log("[db] Data awal dibuat.");
  console.log(`[db] Login admin : admin / ${adminPassword}`);
  console.log(`[db] Login user  : budi / ${userPassword}`);
  console.log("[db] GANTI password ini sebelum dipakai sungguhan.");
}
