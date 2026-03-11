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
  isHydrated: boolean;
  isAuthOpen: boolean;
  authIntent: AuthIntent;
  masterOtp: string;
  openAuth: (intent?: AuthIntent) => void;
  closeAuth: () => void;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const STORAGE_KEY = "quickbasket-user";
const DEFAULT_MASTER_OTP = process.env.NEXT_PUBLIC_MASTER_OTP ?? "123456";

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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("account");

  useEffect(() => {
    const storedUser = window.localStorage.getItem(STORAGE_KEY);

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

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!user) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }, [isHydrated, user]);

  const openAuth = (intent: AuthIntent = "account") => {
    setAuthIntent(intent);
    setIsAuthOpen(true);
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
    setAuthIntent("account");
  };

  const login = (nextUser: AuthUser) => {
    setUser(nextUser);
    setIsAuthOpen(false);
    setAuthIntent("account");
  };

  const logout = () => {
    setUser(null);
    setIsAuthOpen(false);
    setAuthIntent("account");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isHydrated,
        isAuthOpen,
        authIntent,
        masterOtp: DEFAULT_MASTER_OTP,
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
