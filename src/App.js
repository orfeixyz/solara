import React, { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import DashboardScreen from "./screens/DashboardScreen";
import IslandScreen from "./screens/IslandScreen";
import TutorialScreen from "./screens/TutorialScreen";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ResourcePanel from "./components/ResourcePanel";
import ToastStack from "./components/ToastStack";
import ChatDrawer from "./components/ChatDrawer";
import ButtonSound from "./components/ButtonSound";
import { useAuth } from "./context/AuthContext";
import { useGame } from "./context/GameContext";
import { imageMap } from "./data/imageMap";

function ProtectedLayout({ children }) {
  const location = useLocation();
  const { logout, deleteAccount, user } = useAuth();
  const {
    resources,
    toasts,
    chatMessages,
    connectedUsers,
    sendChatMessage,
    pushToast
  } = useGame();
  const [chatOpen, setChatOpen] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete your account permanently? This removes your island and progress.");
    if (!confirmed) {
      return;
    }

    const ok = await deleteAccount();
    if (!ok) {
      pushToast("error", "Could not delete account.");
    }
  };

  return (
    <div
      className="app-shell"
      style={{
        backgroundImage: `url(${imageMap.backgrounds.sky})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <Navbar
        user={user}
        onLogout={logout}
        onDeleteAccount={handleDeleteAccount}
        location={location}
        onOpenChat={() => setChatOpen(true)}
      />
      <ResourcePanel resources={resources} />
      <main className={`screen-container ${location.pathname === "/world" ? "world-screen" : ""}`}>{children}</main>
      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        connectedUsers={connectedUsers}
        onSend={sendChatMessage}
        currentUser={user?.username || "You"}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}

function App() {
  const { token } = useAuth();

  return (
    <><ButtonSound /><Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route
        path="/tutorial"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <TutorialScreen />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/world"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <DashboardScreen />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/island/:id"
        element={
          <ProtectedRoute>
            <ProtectedLayout>
              <IslandScreen />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={token ? "/world" : "/login"} replace />} />
    </Routes></>
  );
}

export default App;


