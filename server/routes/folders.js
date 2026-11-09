import { Router } from "express";

import { db } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = Router();
router.use(requireAuth);

const ROOT = "root";

function parseFolderId(raw) {
  if (raw === undefined || raw === null || raw === "" || raw === ROOT) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("ID folder tidak valid");
    err.status = 400;
    err.publicMessage = "ID folder tidak valid.";
    throw err;
  }
  return id;
}

// Susun remah roti (breadcrumb) dari folder saat ini sampai root
function buildBreadcrumb(folderId) {
  const trail = [];
  let cursor = folderId;
  let guard = 0;

  while (cursor !== null && guard++ < 100) {
    const row = db.prepare("SELECT id, name, parent_id FROM folders WHERE id = ?").get(cursor);
    if (!row) break;
    trail.unshift({ id: row.id, name: row.name });
    cursor = row.parent_id;
  }
  return trail;
}

// GET /api/folders — semua folder (dipakai admin saat memilih folder induk)
router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, name, parent_id FROM folders ORDER BY name").all();
  res.json({ folders: rows });
});

// GET /api/folders/:id/contents — isi satu folder + breadcrumb
router.get("/:id/contents", (req, res) => {
  const folderId = parseFolderId(req.params.id === ROOT ? ROOT : req.params.id);

  if (folderId !== null) {
    const exists = db.prepare("SELECT id FROM folders WHERE id = ?").get(folderId);
    if (!exists) return res.status(404).json({ error: "Folder tidak ditemukan." });
  }

  const folders = db
    .prepare(
      folderId === null
        ? "SELECT id, name FROM folders WHERE parent_id IS NULL ORDER BY name"
        : "SELECT id, name FROM folders WHERE parent_id = ? ORDER BY name"
    )
    .all(...(folderId === null ? [] : [folderId]));

  const files = db
    .prepare(
      folderId === null
        ? "SELECT id, name, mime, size, created_at, uploaded_by FROM files WHERE folder_id IS NULL ORDER BY name"
        : "SELECT id, name, mime, size, created_at, uploaded_by FROM files WHERE folder_id = ? ORDER BY name"
    )
    .all(...(folderId === null ? [] : [folderId]));

  res.json({
    folder: folderId === null ? { id: ROOT, name: "Beranda" } : { id: folderId, name: buildBreadcrumb(folderId).at(-1)?.name },
    breadcrumb: folderId === null ? [] : buildBreadcrumb(folderId),
    folders,
    files,
  });
});

// POST /api/folders — buat folder (admin)
router.post("/", requireAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const parentId = parseFolderId(req.body?.parentId);

  if (name.length < 1 || name.length > 80) {
    return res.status(400).json({ error: "Nama folder wajib diisi (maksimal 80 karakter)." });
  }

  if (parentId !== null) {
    const parent = db.prepare("SELECT id FROM folders WHERE id = ?").get(parentId);
    if (!parent) return res.status(404).json({ error: "Folder induk tidak ditemukan." });
  }

  const duplicate = db
    .prepare(
      parentId === null
        ? "SELECT id FROM folders WHERE name = ? AND parent_id IS NULL"
        : "SELECT id FROM folders WHERE name = ? AND parent_id = ?"
    )
    .get(...(parentId === null ? [name] : [name, parentId]));

  if (duplicate) {
    return res.status(409).json({ error: "Folder dengan nama itu sudah ada di lokasi ini." });
  }

  const info = db.prepare("INSERT INTO folders (name, parent_id) VALUES (?, ?)").run(name, parentId);
  res.status(201).json({ folder: { id: Number(info.lastInsertRowid), name, parentId } });
});

// PATCH /api/folders/:id — ubah nama folder (admin)
router.patch("/:id", requireAdmin, (req, res) => {
  const id = parseFolderId(req.params.id);
  const name = String(req.body?.name || "").trim();

  if (name.length < 1 || name.length > 80) {
    return res.status(400).json({ error: "Nama folder wajib diisi (maksimal 80 karakter)." });
  }

  const info = db.prepare("UPDATE folders SET name = ? WHERE id = ?").run(name, id);
  if (info.changes === 0) return res.status(404).json({ error: "Folder tidak ditemukan." });

  res.json({ folder: { id, name } });
});

// DELETE /api/folders/:id — hapus folder kosong (admin)
router.delete("/:id", requireAdmin, (req, res) => {
  const id = parseFolderId(req.params.id);

  const child = db.prepare("SELECT COUNT(*) AS c FROM folders WHERE parent_id = ?").get(id).c;
  const file = db.prepare("SELECT COUNT(*) AS c FROM files WHERE folder_id = ?").get(id).c;

  if (child > 0 || file > 0) {
    return res.status(409).json({
      error: "Folder masih berisi subfolder atau berkas. Kosongkan dulu sebelum dihapus.",
    });
  }

  const info = db.prepare("DELETE FROM folders WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Folder tidak ditemukan." });

  res.json({ ok: true });
});

export default router;
