"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id?: number;
  name: string;
  phone: string;
  email?: string;
}

type AuthIntent = "account" | "checkout";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  isAuthOpen: boolean;
  authIntent: AuthIntent;
  openAuth: (intent?: AuthIntent) => void;
  closeAuth: () => void;
  login: (user: AuthUser, token?: string | null) => void;
  logout: () => void;
}

const STORAGE_KEY = "quickbasket-user";
const TOKEN_KEY = "quickbasket-token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isStoredUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthUser>;
  const hasValidId = typeof candidate.id === "undefined" || typeof candidate.id === "number";
  const hasValidEmail = typeof candidate.email === "undefined" || typeof candidate.email === "string";

  return typeof candidate.name === "string" && typeof candidate.phone === "string" && hasValidId && hasValidEmail;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("account");

  useEffect(() => {
    const storedUser = window.localStorage.getItem(STORAGE_KEY);
    const storedToken = window.localStorage.getItem(TOKEN_KEY);

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as unknown;

        if (isStoredUser(parsedUser)) {
          setUser(parsedUser);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (storedToken) {
      setToken(storedToken);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!user) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  }, [isHydrated, token, user]);

  const openAuth = (intent: AuthIntent = "account") => {
    setAuthIntent(intent);
    setIsAuthOpen(true);
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
    setAuthIntent("account");
  };

  const login = (nextUser: AuthUser, nextToken: string | null = null) => {
    setUser(nextUser);
    setToken(nextToken);
    setIsAuthOpen(false);
    setAuthIntent("account");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthOpen(false);
    setAuthIntent("account");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isHydrated,
        isAuthOpen,
        authIntent,
        openAuth,
        closeAuth,
        login,
        logout
      }}
    >
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
