import { Router } from "express";
import bcrypt from "bcryptjs";

import { db } from "../db.js";
import {
  issueSession,
  clearSession,
  requireAuth,
  loginRateLimit,
  resetLoginAttempts,
} from "../auth.js";

const router = Router();

function publicUser(row) {
  return { id: row.id, username: row.username, role: row.role };
}

// POST /api/auth/login
router.post("/login", loginRateLimit, (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  // Pesan sengaja dibuat sama untuk username salah maupun password salah,
  // supaya penyerang tidak bisa menebak username mana yang ada.
  const passwordBenar = user && bcrypt.compareSync(password, user.password_hash);

  if (!passwordBenar) {
    return res.status(401).json({ error: "Username atau password salah." });
  }

  resetLoginAttempts(req);
  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// GET /api/auth/me — dipakai frontend untuk memulihkan sesi setelah refresh
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/password — ganti password sendiri
router.post("/password", requireAuth, (req, res) => {
  const lama = String(req.body?.currentPassword || "");
  const baru = String(req.body?.newPassword || "");

  if (baru.length < 8) {
    return res.status(400).json({ error: "Password baru minimal 8 karakter." });
  }

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(lama, row.password_hash)) {
    return res.status(400).json({ error: "Password lama salah." });
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(baru, 10),
    req.user.id
  );
  res.json({ ok: true });
});

export default router;
