import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

import { api } from "../api";

const AdminPanel = () => {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: "", parentId: "root" });

  const reload = useCallback(async () => {
    setError("");
    try {
      const [userData, folderData] = await Promise.all([api.users(), api.allFolders()]);
      setUsers(userData.users ?? []);
      setFolders(folderData.folders ?? []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createUser(newUser.username.trim(), newUser.password, newUser.role);
      setNotice(`User "${newUser.username}" dibuat.`);
      setUserDialogOpen(false);
      setNewUser({ username: "", password: "", role: "user" });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Hapus user "${user.username}"?`)) return;
    try {
      await api.deleteUser(user.id);
      setNotice(`User "${user.username}" dihapus.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const parentId = newFolder.parentId === "root" ? null : Number(newFolder.parentId);
      await api.createFolder(newFolder.name.trim(), parentId);
      setNotice(`Folder "${newFolder.name}" dibuat.`);
      setNewFolder({ name: "", parentId: "root" });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Hapus folder "${folder.name}"?`)) return;
    try {
      await api.deleteFolder(folder.id);
      setNotice(`Folder "${folder.name}" dihapus.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const parentName = (parentId) =>
    parentId ? folders.find((f) => f.id === parentId)?.name ?? "(folder induk terhapus)" : "—";

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Pengguna" />
        <Tab label="Folder" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUserDialogOpen(true)}
            >
              Tambah User
            </Button>
          </Box>

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Dibuat</TableCell>
                  <TableCell align="right">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>Belum ada user.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.created_at}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Hapus user">
                          <IconButton
                            aria-label={`hapus ${user.username}`}
                            color="error"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {tab === 1 && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Buat folder baru
            </Typography>
            <Box component="form" onSubmit={handleCreateFolder}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Nama folder"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  required
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="parent-folder-label">Folder induk</InputLabel>
                  <Select
                    labelId="parent-folder-label"
                    label="Folder induk"
                    value={newFolder.parentId}
                    onChange={(e) => setNewFolder({ ...newFolder, parentId: e.target.value })}
                  >
                    <MenuItem value="root">Beranda (root)</MenuItem>
                    {folders.map((folder) => (
                      <MenuItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button type="submit" variant="contained" disabled={saving} startIcon={<AddIcon />}>
                  Tambah
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nama folder</TableCell>
                  <TableCell>Folder induk</TableCell>
                  <TableCell align="right">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {folders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>Belum ada folder.</TableCell>
                  </TableRow>
                ) : (
                  folders.map((folder) => (
                    <TableRow key={folder.id}>
                      <TableCell>{folder.name}</TableCell>
                      <TableCell>{parentName(folder.parent_id)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Hapus folder">
                          <IconButton
                            aria-label={`hapus ${folder.name}`}
                            color="error"
                            onClick={() => handleDeleteFolder(folder)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Tambah User</DialogTitle>
        <Box component="form" onSubmit={handleCreateUser}>
          <DialogContent>
            <TextField
              label="Username"
              fullWidth
              required
              size="small"
              sx={{ mb: 2 }}
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              helperText="3–32 karakter: huruf, angka, titik, garis bawah, strip"
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              size="small"
              sx={{ mb: 2 }}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              helperText="Minimal 8 karakter"
            />
            <FormControl fullWidth size="small">
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                label="Role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <MenuItem value="user">user</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>Batal</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              Simpan
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={!!notice}
        autoHideDuration={4000}
        onClose={() => setNotice("")}
        message={notice}
      />
    </Box>
  );
};

export default AdminPanel;
