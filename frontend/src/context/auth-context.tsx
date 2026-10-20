"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (formData: FormData) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, feature: string, action: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await apiClient.get<User>("/auth/me");
      setUser(res.data);
      if (typeof window !== "undefined") {
        localStorage.setItem("current_user", JSON.stringify(res.data));
      }
    } catch {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (formData: FormData) => {
    setLoading(true);
    try {
      // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
      const res = await apiClient.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const token = res.data.access_token;
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", token);
      }
      await fetchCurrentUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout").catch(() => {});
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
      }
      setUser(null);
      window.location.href = "/login";
    }
  };

  const hasPermission = (module: string, feature: string, action: string): boolean => {
    if (!user) return false;
    if (user.is_superuser) return true;

    const targetCode = `${module}:${feature}:${action}`;
    if (user.permissions && user.permissions.includes(targetCode)) {
      return true;
    }

    if (user.roles) {
      for (const role of user.roles) {
        if (role.permissions) {
          for (const perm of role.permissions) {
            if (
              perm.code === targetCode ||
              (perm.module === module && perm.feature === feature && perm.action === action)
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPermission,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
