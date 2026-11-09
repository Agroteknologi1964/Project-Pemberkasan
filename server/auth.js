// Autentikasi: JWT disimpan di cookie httpOnly, jadi token tidak bisa dibaca JavaScript.
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

let secret = process.env.JWT_SECRET;

if (!secret) {
  secret = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[auth] JWT_SECRET belum diset — memakai kunci acak sementara. " +
      "Semua sesi akan hilang setiap server restart. Set JWT_SECRET di .env untuk produksi."
  );
}

const TOKEN_TTL = "8h";
export const COOKIE_NAME = "pemberkasan_session";

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.COOKIE_SECURE === "true", // aktifkan kalau sudah HTTPS di belakang proxy
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
});

export function issueSession(res, user) {
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    secret,
    { expiresIn: TOKEN_TTL }
  );
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Belum login." });

  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    clearSession(res);
    return res.status(401).json({ error: "Sesi tidak valid atau sudah kedaluwarsa." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Hanya admin yang boleh melakukan ini." });
  }
  next();
}

// Pembatas percobaan login sederhana (in-memory) untuk menahan brute force.
const attempts = new Map();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;

export function loginRateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const record = attempts.get(key);

  if (record && now - record.first < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    const sisaMenit = Math.ceil((WINDOW_MS - (now - record.first)) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan login. Coba lagi dalam ${sisaMenit} menit.`,
    });
  }

  if (!record || now - record.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
  } else {
    record.count += 1;
  }

  next();
}

export function resetLoginAttempts(req) {
  attempts.delete(req.ip || "unknown");
}
