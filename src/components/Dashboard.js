import React, { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import LogoutIcon from "@mui/icons-material/Logout";
import FolderExplorer from "./FolderExplorer";
import AdminPanel from "./AdminPanel";

const Dashboard = ({ user, onLogout }) => {
  const isAdmin = user.role === "admin";
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <FolderIcon />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Aplikasi Pemberkasan
          </Typography>
          <Chip
            label={`${user.username} · ${user.role}`}
            color={isAdmin ? "secondary" : "default"}
            size="small"
          />
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {isAdmin && (
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Berkas" />
            <Tab label="Kelola (Admin)" />
          </Tabs>
        )}

        {isAdmin && tab === 1 ? <AdminPanel /> : <FolderExplorer user={user} />}
      </Container>
    </Box>
  );
};

export default Dashboard;
