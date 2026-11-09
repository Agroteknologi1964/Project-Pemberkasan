// Satu pintu untuk semua komunikasi ke server.
// Semua request membawa cookie sesi (credentials: "include"), token tidak pernah
// disimpan di JavaScript sehingga tidak bisa dicuri lewat XSS.
const BASE = process.env.REACT_APP_API_URL || "";

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  let payload = body;

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: payload,
      credentials: "include",
    });
  } catch {
    throw new Error("Tidak bisa menghubungi server. Periksa koneksi atau pastikan server berjalan.");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.error || `Permintaan gagal (kode ${res.status}).`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: { username, password } }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    request("/api/auth/password", { method: "POST", body: { currentPassword, newPassword } }),

  contents: (folderId) => request(`/api/folders/${folderId}/contents`),
  allFolders: () => request("/api/folders"),
  createFolder: (name, parentId) =>
    request("/api/folders", { method: "POST", body: { name, parentId } }),
  deleteFolder: (id) => request(`/api/folders/${id}`, { method: "DELETE" }),

  uploadFile: (folderId, file) => {
    const form = new FormData();
    form.append("folderId", folderId);
    form.append("file", file);
    return request("/api/files", { method: "POST", body: form });
  },
  deleteFile: (id) => request(`/api/files/${id}`, { method: "DELETE" }),
  downloadUrl: (id) => `${BASE}/api/files/${id}/download`,

  users: () => request("/api/users"),
  createUser: (username, password, role) =>
    request("/api/users", { method: "POST", body: { username, password, role } }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
};

export function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
