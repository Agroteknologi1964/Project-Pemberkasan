import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import { db, UPLOAD_DIR } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = Router();
router.use(requireAuth);

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".jpg", ".jpeg", ".png", ".zip", ".rar", ".txt",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Nama di disk diacak: nama asli tidak dipakai sebagai path (mencegah path traversal)
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      const err = new Error("Tipe berkas tidak diizinkan");
      err.status = 400;
      err.publicMessage = `Tipe berkas ${ext || "(tanpa ekstensi)"} tidak diizinkan.`;
      return cb(err);
    }
    cb(null, true);
  },
});

// Multer menyimpan nama file non-ASCII sebagai latin1; ubah ke UTF-8
function fixName(name) {
  try {
    const fixed = Buffer.from(name, "latin1").toString("utf8");
    return fixed.includes("\uFFFD") ? name : fixed;
  } catch {
    return name;
  }
}

// POST /api/files  (multipart: file + folderId)
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Berkas wajib dipilih." });

  const rawFolder = req.body?.folderId ?? "root";
  const folderId = rawFolder === "root" || rawFolder === "" ? null : Number(rawFolder);

  if (folderId !== null) {
    if (!Number.isInteger(folderId)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "Folder tujuan tidak valid." });
    }
    const exists = db.prepare("SELECT id FROM folders WHERE id = ?").get(folderId);
    if (!exists) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: "Folder tujuan tidak ditemukan." });
    }
  }

  const name = fixName(req.file.originalname);
  const info = db
    .prepare(
      "INSERT INTO files (name, folder_id, stored_name, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, folderId, req.file.filename, req.file.mimetype, req.file.size, req.user.id);

  res.status(201).json({
    file: { id: Number(info.lastInsertRowid), name, size: req.file.size, mime: req.file.mimetype },
  });
});

// GET /api/files/:id/download
router.get("/:id/download", (req, res) => {
  const row = db
    .prepare("SELECT name, stored_name FROM files WHERE id = ?")
    .get(Number(req.params.id));

  if (!row) return res.status(404).json({ error: "Berkas tidak ditemukan." });

  const filePath = path.join(UPLOAD_DIR, row.stored_name);
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ error: "Berkas fisik sudah tidak ada di server." });
  }

  res.download(filePath, row.name);
});

// DELETE /api/files/:id — admin atau pengunggahnya sendiri
router.delete("/:id", (req, res, next) => {
  const row = db
    .prepare("SELECT id, stored_name, uploaded_by FROM files WHERE id = ?")
    .get(Number(req.params.id));

  if (!row) return res.status(404).json({ error: "Berkas tidak ditemukan." });

  if (req.user.role !== "admin" && row.uploaded_by !== req.user.id) {
    const err = new Error("Bukan pemilik berkas");
    err.status = 403;
    err.publicMessage = "Kamu hanya bisa menghapus berkas yang kamu unggah sendiri.";
    return next(err);
  }

  db.prepare("DELETE FROM files WHERE id = ?").run(row.id);
  fs.unlink(path.join(UPLOAD_DIR, row.stored_name), () => {});
  res.json({ ok: true });
});

// GET /api/files — daftar semua berkas (admin)
router.get("/", requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT f.id, f.name, f.size, f.created_at, fo.name AS folder,
              u.username AS uploaded_by
         FROM files f
         LEFT JOIN folders fo ON fo.id = f.folder_id
         LEFT JOIN users u ON u.id = f.uploaded_by
        ORDER BY f.created_at DESC`
    )
    .all();
  res.json({ files: rows });
});

export default router;
