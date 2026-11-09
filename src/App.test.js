import { render, screen } from "@testing-library/react";
import App from "./App";

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  });
}

function mockFetch(handlers) {
  global.fetch = jest.fn((url) => {
    const match = handlers.find(([fragment]) => String(url).includes(fragment));
    return match ? match[1]() : jsonResponse(401, { error: "Belum login." });
  });
}

afterEach(() => {
  delete global.fetch;
});

test("menampilkan form login saat belum login", async () => {
  mockFetch([["/api/auth/me", () => jsonResponse(401, { error: "Belum login." })]]);

  render(<App />);

  expect(await screen.findByRole("button", { name: /login/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

test("memulihkan sesi admin dan menampilkan tab kelola setelah refresh", async () => {
  mockFetch([
    ["/api/auth/me", () => jsonResponse(200, { user: { id: 1, username: "admin", role: "admin" } })],
    [
      "/api/folders/root/contents",
      () =>
        jsonResponse(200, {
          folder: { id: "root", name: "Beranda" },
          breadcrumb: [],
          folders: [],
          files: [],
        }),
    ],
  ]);

  render(<App />);

  expect(await screen.findByText(/aplikasi pemberkasan/i)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /kelola \(admin\)/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^login$/i })).not.toBeInTheDocument();
});
