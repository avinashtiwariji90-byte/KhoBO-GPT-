"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, User, getStoredToken, removeStoredToken } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    company_name?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const me = await api.getMe();
      setUser(me);
    } catch {
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    await api.login({ email, password: pass });
    await refreshUser();
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    company_name?: string;
  }) => {
    await api.register(data);
    await refreshUser();
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
