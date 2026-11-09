import { Router } from "express";
import bcrypt from "bcryptjs";

import { db } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

function publicUser(row) {
  return { id: row.id, username: row.username, role: row.role, created_at: row.created_at };
}

// GET /api/users — daftar user (admin)
router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT id, username, role, created_at FROM users ORDER BY username")
    .all();
  res.json({ users: rows.map(publicUser) });
});

// POST /api/users — tambah user (admin)
router.post("/", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "user");

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: "Username 3–32 karakter, hanya huruf, angka, titik, garis bawah, atau strip.",
    });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password minimal 8 karakter." });
  }
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Role harus 'admin' atau 'user'." });
  }

  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exists) return res.status(409).json({ error: "Username sudah dipakai." });

  const info = db
    .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
    .run(username, bcrypt.hashSync(password, 10), role);

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(info.lastInsertRowid));
  res.status(201).json({ user: publicUser(row) });
});

// PATCH /api/users/:id/password — reset password user (admin)
router.patch("/:id/password", (req, res) => {
  const id = Number(req.params.id);
  const password = String(req.body?.password || "");

  if (password.length < 8) {
    return res.status(400).json({ error: "Password minimal 8 karakter." });
  }

  const info = db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(bcrypt.hashSync(password, 10), id);

  if (info.changes === 0) return res.status(404).json({ error: "User tidak ditemukan." });
  res.json({ ok: true });
});

// DELETE /api/users/:id — hapus user (admin)
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ error: "Tidak bisa menghapus akun yang sedang dipakai." });
  }

  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "User tidak ditemukan." });

  if (target.role === "admin") {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) {
      return res.status(409).json({ error: "Minimal harus ada satu admin yang tersisa." });
    }
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ ok: true });
});

export default router;
