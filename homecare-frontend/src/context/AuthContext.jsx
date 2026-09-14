import { createContext, useContext, useState, useCallback } from "react";
import { authApi, getSession, saveSession, clearSession } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  const login = useCallback(async (role, payload) => {
    const res = await authApi.login(role, payload);
    const { user, accessToken, refreshToken } = res.data;
    saveSession({ accessToken, refreshToken, role, user });
    setSession({ role, refreshToken, user });
    return user;
  }, []);

  const register = useCallback(async (role, payload) => {
    const res = await authApi.register(role, payload);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (session?.role) await authApi.logout(session.role);
    } catch {
      // best-effort — clear local session regardless
    }
    clearSession();
    setSession(null);
  }, [session]);

  const value = {
    role: session?.role || null,
    user: session?.user || null,
    isAuthenticated: !!session,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
