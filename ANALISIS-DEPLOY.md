# Analisis, Perbaikan & Rencana Deploy — projectpemberkasan

Terakhir diperbarui: 30 Oktober 2026

## 0. Ringkasan

Awalnya proyek ini adalah **mockup UI React tanpa backend**: login menerima password apa pun, role ditentukan dari nama user di browser, dan semua folder/berkas adalah data hardcoded.

Bug kritis sampai sedang **sudah diperbaiki**:

| Kode | Masalah | Status | Bukti uji |
|---|---|---|---|
| B1 | Password apa pun diterima | ✅ Diperbaiki | password salah → `401 {"error":"Username atau password salah."}`, UI menampilkan pesan error |
| B2 | Admin hanya dari nama `admin` | ✅ Diperbaiki | role dibaca dari database; user biasa dapat `403` saat mengakses `/api/users` |
| B3 | Data palsu, tombol mati, refresh = logout | ✅ Diperbaiki | unggah/unduh/hapus berkas & tambah user/folder berfungsi; refresh tetap login |
| B4 | Error `non-boolean attribute button` | ✅ Diperbaiki | console browser bersih (`[]`) |
| B5 | `npm test` gagal | ✅ Diperbaiki | `2 passed, 2 total` |
| B6 | `files.length` tanpa penjagaan → white screen | ✅ Diperbaiki | data selalu array dari API + fallback `?? []` |
| B7 | Branding CRA (judul, meta) | ✅ Diperbaiki | `<title>Aplikasi Pemberkasan</title>` |
| B9 | Dependency testing di `dependencies` | ✅ Diperbaiki | dipindah ke `devDependencies` |
| B8 | Tidak ada router (URL tidak berubah) | ⏳ Belum — fase lanjutan | — |
| B10 | CRA 5 tidak dirawat, rapuh di Node 26 | ⏳ Belum — fase lanjutan | lihat §4 |
| B11 | Repo belum di-backup ke remote | ⏳ Perlu dilakukan | `git remote -v` masih kosong |

---

## 1. Arsitektur sekarang

| Lapisan | Teknologi | Lokasi |
|---|---|---|
| Frontend | React 19 + Material UI 9 (CRA 5) | `src/` |
| Backend | Express 5 + `node:sqlite` (SQLite bawaan Node) | `server/` |
| Auth | bcrypt (hash password) + JWT di cookie `httpOnly` | `server/auth.js` |
| Unggahan | multer, nama file diacak, whitelist ekstensi, maks 25 MB | `server/routes/files.js` |
| Database | `server/data/pemberkasan.db` | dibuat otomatis |
| Berkas | `server/data/uploads/` | dibuat otomatis |

Endpoint API:

```
POST   /api/auth/login            login (maks 6 percobaan / 15 menit / IP)
POST   /api/auth/logout
GET    /api/auth/me               memulihkan sesi setelah refresh
POST   /api/auth/password         ganti password sendiri
GET    /api/folders               semua folder (admin)
GET    /api/folders/:id/contents  isi folder + breadcrumb
POST   /api/folders               buat folder (admin)
PATCH  /api/folders/:id           ganti nama folder (admin)
DELETE /api/folders/:id           hapus folder kosong (admin)
POST   /api/files                 unggah berkas (multipart: file + folderId)
GET    /api/files/:id/download    unduh berkas (wajib login)
DELETE /api/files/:id             hapus (admin / pengunggah)
GET    /api/users                 daftar user (admin)
POST   /api/users                 tambah user (admin)
PATCH  /api/users/:id/password    reset password (admin)
DELETE /api/users/:id             hapus user (admin; tidak bisa diri sendiri / admin terakhir)
GET    /api/health                cek server hidup
```

Otorisasi ditegakkan **di server** (`requireAuth`, `requireAdmin`). Menyembunyikan tombol di UI hanya kosmetik.

---

## 2. Pengujian yang sudah dijalankan

Backend (curl):

- login password salah → 401; username tidak ada → 401 (pesan sama, tidak membocorkan username valid)
- login benar → 200 + cookie; `/api/auth/me` dengan cookie → 200; tanpa cookie → 401
- user biasa buat folder → 403; user biasa buka `/api/users` → 403
- upload `.txt` → 201; upload `.exe` → 400; unduh → isi berkas benar; unduh tanpa login → 401
- folder duplikat → 409; hapus akun sendiri → 400; password < 8 karakter → 400
- 7 percobaan login salah → percobaan ke-7 dibalas 429

Frontend (browser, build produksi):

- login salah → pesan "Username atau password salah.", tetap di halaman login
- login benar → dashboard dengan tab Berkas + Kelola (Admin)
- refresh halaman → sesi tetap aktif
- masuk folder → breadcrumb "Beranda › Berkas Umum"
- unggah berkas lewat UI → muncul dengan ukuran "1 KB"
- tab admin: tambah user dan folder → langsung tampil di tabel
- logout → kembali ke form login
- login sebagai user biasa → tidak ada tab Kelola (API juga menolak 403)
- console browser bersih, tanpa error React

Build & test:

- `npm run build` → sukses, JS utama 154,1 kB gzip
- `npm test` → 2 test lulus

---

## 3. Menjalankan di lokal (butuh Node >= 22.5)

Dua terminal:

```bash
# Terminal 1 — backend
cd server
npm install
npm start            # http://localhost:4000

# Terminal 2 — frontend
npm install
npm start            # http://localhost:3000, /api diteruskan ke 4000
```

Akun awal (dibuat otomatis saat database masih kosong):

| Username | Password | Role |
|---|---|---|
| admin | Admin#2026 | admin |
| budi | Budi#2026 | user |

**Ganti password ini sebelum dipakai sungguhan.**

---

## 4. Catatan teknis

- **Dev server butuh `DANGEROUSLY_DISABLE_HOST_CHECK=true`** — sudah disiapkan di `.env.development`. Penyebab: React Scripts 5 memakai paket `ip` untuk menentukan host, dan paket itu error di Node 26 sehingga dev server menolak start (`options.allowedHosts[0] should be a non-empty string`). Masalah toolchain CRA, bukan kode aplikasi.
- **`node:sqlite` butuh Node 22.5+.** Kalau hosting hanya menyediakan Node lebih lama, ganti ke `better-sqlite3` atau MySQL.
- **`JWT_SECRET` wajib diisi di produksi.** Tanpa itu server memakai kunci acak dan semua sesi hilang setiap restart.
- SQLite + folder uploads cukup untuk puluhan user. Di atas itu pindah ke MySQL/PostgreSQL + object storage.

---

## 5. Rekomendasi cloud / hosting (diperbarui)

Setelah backend masuk, aplikasi **butuh proses Node.js yang hidup terus** dan penyimpanan berkas. Hosting statis murni (Cloudflare Pages/Netlify) tidak cukup lagi.

| Opsi | Biaya | Cocok untuk | Catatan |
|---|---|---|---|
| **Cloud Hosting ICON** | Rp 25.000/bln (5 GB SSD, 1 GB RAM, Node.js + Git) | Deploy paling murah | Jalankan lewat menu "Setup Node.js App" di cPanel; RAM 1 GB cukup untuk trafik kecil |
| **Cloud VPS NEBULA** | Rp 100.000/bln (2 core, 2 GB RAM, 40 GB SSD) | **Yang saya sarankan** | Root access, Nginx + systemd, kontrol penuh, backup mudah |
| **VPS ALPINE** | Rp 150.000/bln (4 core, 2 GB, panel Webuzo) | Kalau tidak mau menyentuh terminal | Tetap perlu konfigurasi Node.js |

Jangan pilih paket di bawah 1 GB RAM kalau `npm run build` dijalankan di server — build CRA butuh memori. Aman: build di lokal lalu unggah `build/`, atau tambah swap 2 GB.

### Deploy ke VPS (ringkas)

1. VPS Ubuntu 24.04 LTS, arahkan A record domain ke IP VPS.
2. `apt install nginx git`, pasang Node 22 LTS.
3. `git clone` repo → `npm ci && npm run build` → `cd server && npm ci`.
4. Isi `server/.env`: `JWT_SECRET`, `PORT=4000`, `COOKIE_SECURE=true` (setelah HTTPS aktif).
5. Pasang `deploy/pemberkasan.service` sebagai systemd unit, lalu `systemctl enable --now pemberkasan`.
6. Pasang `deploy/nginx-pemberkasan.conf`, aktifkan, lalu `certbot --nginx -d domainkamu.com`.
7. Backup harian: `server/data/pemberkasan.db` + `server/data/uploads/`.

### Deploy ke Cloud Hosting ICON (cPanel)

1. Upload repo lewat Git Version Control cPanel; jalankan `npm run build` di **lokal**, lalu unggah folder `build/` ke satu level di atas `server/`.
2. Menu **Setup Node.js App**: application root `server`, startup file `index.js`, Node 22.
3. Tambahkan environment variable `JWT_SECRET` dan `COOKIE_SECURE=true` di menu tersebut.
4. Jalankan `npm install` dari menu itu, lalu restart aplikasi.

---

## 6. Yang belum dikerjakan

- [ ] Push repo ke GitHub (private) — sekarang `git remote -v` masih kosong
- [ ] Ganti password akun awal sebelum publik
- [ ] Tambah halaman "ganti password" di UI (endpoint `/api/auth/password` sudah siap)
- [ ] Aktifkan HTTPS + `COOKIE_SECURE=true`
- [ ] Backup otomatis harian (cron `sqlite3 .backup` + tar uploads)
- [ ] Router `react-router` supaya posisi folder bisa di-bookmark (B8)
- [ ] Migrasi CRA → Vite (B10)
- [ ] Kuota per user / audit log aktivitas
