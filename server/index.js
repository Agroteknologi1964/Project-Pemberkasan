import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { db } from "./db.js";
import authRoutes from "./routes/auth.js";
import folderRoutes from "./routes/folders.js";
import fileRoutes from "./routes/files.js";
import userRoutes from "./routes/users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", (_req, res) => {
  const users = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  res.json({ ok: true, users });
});

// --- Sajikan hasil `npm run build` (produksi: satu proses, satu domain) ---
const buildDir = path.join(__dirname, "..", "build");
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

// Penanganan error terpusat
app.use((err, _req, res, _next) => {
  console.error("[error]", err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.publicMessage || "Terjadi kesalahan di server." });
});

app.listen(PORT, () => {
  console.log(`[server] berjalan di http://localhost:${PORT}`);
  if (!fs.existsSync(buildDir)) {
    console.log("[server] folder build/ belum ada — mode pengembangan (pakai npm start di root).");
  }
});
