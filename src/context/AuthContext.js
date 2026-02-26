import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { deleteMyAccount, loginUser, registerUser, setAuthToken } from "../services/api";

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const token = localStorage.getItem("solara_token");
    const userRaw = localStorage.getItem("solara_user");
    return {
      token,
      user: userRaw ? JSON.parse(userRaw) : null
    };
  } catch (_error) {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const stored = readStoredAuth();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthToken(token);

    if (token) {
      localStorage.setItem("solara_token", token);
    } else {
      localStorage.removeItem("solara_token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("solara_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("solara_user");
    }
  }, [user]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await loginUser(credentials);
      const nextToken = response.token || response.jwt;
      const nextUser = response.user || { id: response.userId, username: credentials.username };

      try {
        sessionStorage.setItem("solara_post_login_loader", "1");
      } catch (_e) {
        // ignore browser storage errors
      }

      setToken(nextToken);
      setUser(nextUser);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const response = await registerUser(payload);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem("solara_post_login_loader");
    } catch (_e) {
      // ignore browser storage errors
    }

    setToken(null);
    setUser(null);
  };

  const deleteAccount = async () => {
    setLoading(true);
    try {
      await deleteMyAccount();
      logout();
      return true;
    } catch (_error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      deleteAccount
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
