import React, { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { api } from "./api";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pulihkan sesi dari cookie saat halaman dibuka / di-refresh.
  // Inilah yang dulu hilang: sebelumnya refresh = logout.
  useEffect(() => {
    let aktif = true;

    api
      .me()
      .then((data) => aktif && setUser(data.user))
      .catch(() => aktif && setUser(null))
      .finally(() => aktif && setLoading(false));

    return () => {
      aktif = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">
            Memuat…
          </Typography>
        </Box>
      </Box>
    );
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={setUser} />
  );
}

export default App;
