import React, { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ResourcePanel from "./components/ResourcePanel";
import ToastStack from "./components/ToastStack";
import ChatDrawer from "./components/ChatDrawer";
import ButtonSound from "./components/ButtonSound";
import { useAuth } from "./context/AuthContext";
import { useGame } from "./context/GameContext";
import { imageMap } from "./data/imageMap";

const LoginScreen = lazy(() => import("./screens/LoginScreen"));
const RegisterScreen = lazy(() => import("./screens/RegisterScreen"));
const DashboardScreen = lazy(() => import("./screens/DashboardScreen"));
const IslandScreen = lazy(() => import("./screens/IslandScreen"));
const TutorialScreen = lazy(() => import("./screens/TutorialScreen"));

function FullScreenLoader() {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-card">
        <div className="app-loading-spinner" aria-hidden="true" />
        <strong>Preparing world...</strong>
        <small>Loading island data, resources, and shared systems.</small>
      </div>
    </div>
  );
}

function RouteFallback() {
  return <FullScreenLoader />;
}

function ProtectedLayout({ children }) {
  const location = useLocation();
  const { logout, deleteAccount, user, token } = useAuth();
  const { resources, toasts, chatMessages, connectedUsers, sendChatMessage, pushToast, isBootstrapping } = useGame();
  const [chatOpen, setChatOpen] = useState(false);
  const [postLoginLoader, setPostLoginLoader] = useState(() => {
    try {
      return sessionStorage.getItem("solara_post_login_loader") === "1";
    } catch (_e) {
      return false;
    }
  });

  useEffect(() => {
    if (!token) {
      try {
        sessionStorage.removeItem("solara_post_login_loader");
      } catch (_e) {
        // ignore
      }
      setPostLoginLoader(false);
      return;
    }

    try {
      const active = sessionStorage.getItem("solara_post_login_loader") === "1";
      setPostLoginLoader(active);
    } catch (_e) {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (!isBootstrapping) {
      try {
        sessionStorage.removeItem("solara_post_login_loader");
      } catch (_e) {
        // ignore
      }
      setPostLoginLoader(false);
    }
  }, [isBootstrapping, token]);

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

  const showLoading = Boolean(token) && (isBootstrapping || postLoginLoader);
  if (showLoading) {
    return <FullScreenLoader />;
  }

  return (
    <div
      className="app-shell app-shell-ready"
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
    <>
      <ButtonSound />
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </>
  );
}

export default App;
