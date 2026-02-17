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
import { useAuth } from "./context/AuthContext";
import { useGame } from "./context/GameContext";
import { imageMap } from "./data/imageMap";

function ProtectedLayout({ children }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const {
    resources,
    setTimeMultiplier,
    timeMultiplier,
    toasts,
    chatMessages,
    connectedUsers,
    sendChatMessage
  } = useGame();
  const [chatOpen, setChatOpen] = useState(false);

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
      <Navbar user={user} onLogout={logout} location={location} onOpenChat={() => setChatOpen(true)} />
      <ResourcePanel
        resources={resources}
        timeMultiplier={timeMultiplier}
        onChangeMultiplier={setTimeMultiplier}
      />
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
    <Routes>
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
    </Routes>
  );
}

export default App;
