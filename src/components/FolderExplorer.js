import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";

import { api, formatSize } from "../api";

const ROOT = "root";

const FolderExplorer = ({ user }) => {
  const [folderId, setFolderId] = useState(ROOT);
  const [data, setData] = useState({ folder: null, breadcrumb: [], folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(
    async (id) => {
      setLoading(true);
      setError("");
      try {
        // Data selalu datang dari server; bentuknya dijamin punya folders & files.
        const result = await api.contents(id);
        setData({
          folder: result.folder ?? null,
          breadcrumb: result.breadcrumb ?? [],
          folders: result.folders ?? [],
          files: result.files ?? [],
        });
      } catch (err) {
        setError(err.message);
        // Jangan biarkan data lama tampil seolah masih valid
        setData({ folder: null, breadcrumb: [], folders: [], files: [] });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(folderId);
  }, [folderId, load]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // supaya berkas yang sama bisa diunggah lagi
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      await api.uploadFile(folderId, file);
      setNotice(`Berkas "${file.name}" berhasil diunggah.`);
      await load(folderId);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Hapus berkas "${file.name}"?`)) return;

    try {
      await api.deleteFile(file.id);
      setNotice(`Berkas "${file.name}" dihapus.`);
      await load(folderId);
    } catch (err) {
      setError(err.message);
    }
  };

  const canDelete = (file) => user.role === "admin" || file.uploaded_by === user.id;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Breadcrumbs aria-label="breadcrumb" separator="›">
          <Link
            component="button"
            underline="hover"
            color={data.breadcrumb.length === 0 ? "text.primary" : "primary"}
            onClick={() => setFolderId(ROOT)}
            sx={{ cursor: "pointer" }}
          >
            Beranda
          </Link>
          {data.breadcrumb.map((folder, index) => (
            <Link
              key={folder.id}
              component="button"
              underline="hover"
              color={index === data.breadcrumb.length - 1 ? "text.primary" : "primary"}
              onClick={() => setFolderId(folder.id)}
              sx={{ cursor: "pointer" }}
            >
              {folder.name}
            </Link>
          ))}
        </Breadcrumbs>

        <Box>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleUpload}
          />
          <Button
            variant="contained"
            startIcon={
              uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />
            }
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Mengunggah…" : "Unggah Berkas"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Folder
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">Memuat data…</Typography>
          </Box>
        ) : data.folders.length === 0 ? (
          <Typography color="text.secondary">Tidak ada folder.</Typography>
        ) : (
          <List disablePadding>
            {data.folders.map((folder) => (
              <ListItem key={folder.id} disablePadding>
                <ListItemButton onClick={() => setFolderId(folder.id)}>
                  <ListItemIcon>
                    <FolderIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={folder.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Berkas
        </Typography>

        {!loading && data.files.length === 0 ? (
          <Typography color="text.secondary">Tidak ada berkas.</Typography>
        ) : (
          <List disablePadding>
            {data.files.map((file) => (
              <ListItem
                key={file.id}
                divider
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Unduh">
                      <IconButton
                        aria-label={`unduh ${file.name}`}
                        component="a"
                        href={api.downloadUrl(file.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    {canDelete(file) && (
                      <Tooltip title="Hapus">
                        <IconButton
                          aria-label={`hapus ${file.name}`}
                          color="error"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
              >
                <ListItemIcon>
                  <InsertDriveFileIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={formatSize(file.size)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Snackbar
        open={!!notice}
        autoHideDuration={4000}
        onClose={() => setNotice("")}
        message={notice}
      />
    </Box>
  );
};

export default FolderExplorer;
