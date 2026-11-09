import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";

import { api } from "../api";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Verifikasi dilakukan di server: password salah ditolak dengan 401.
      const data = await api.login(username.trim(), password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        margin: "auto",
        mt: 10,
        p: 3,
        textAlign: "center",
        boxShadow: 3,
        borderRadius: 2,
        bgcolor: "white",
      }}
    >
      <Typography variant="h4" sx={{ mb: 1 }}>
        Login
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Aplikasi Pemberkasan
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          required
          autoFocus
          autoComplete="username"
          sx={{ mb: 2 }}
          value={username}
          disabled={submitting}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          required
          autoComplete="current-password"
          sx={{ mb: 2 }}
          value={password}
          disabled={submitting}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {submitting ? "Memeriksa…" : "Login"}
        </Button>
      </form>
    </Box>
  );
};

export default Login;
