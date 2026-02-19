import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { GameProvider } from "./context/GameContext";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./styles/index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
