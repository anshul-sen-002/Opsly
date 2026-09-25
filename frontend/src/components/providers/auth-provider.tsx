"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authApi, bindAuthBridge, refreshTokens } from "@/lib/api";
import { getTokenExpiryMs } from "@/lib/jwt";
import { useToast } from "./toast-provider";
import type { AuthResponse, AuthUser } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const WARN_BEFORE_EXPIRY_MS = 30_000;
const STORAGE_TOKEN_KEY = "opsly.accessToken";
const STORAGE_USER_KEY = "opsly.user";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  sessionWarning: boolean;
  loginStaff: (email: string, password: string) => Promise<void>;
  loginCustomer: (email: string, password: string) => Promise<void>;
  registerCustomer: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  /**
   * Patch the cached session user's profile image. Called right after a photo
   * upload so the topbar avatar updates without waiting for a re-login.
   */
  setProfileImageUrl: (url: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  const clearSession = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    warnTimerRef.current = null;
    tokenRef.current = null;
    userRef.current = null;
    setAccessToken(null);
    setUser(null);
    setSessionWarning(false);
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {
      // storage unavailable — nothing to clear
    }
    setStatus("unauthenticated");
  }, []);

  const scheduleWarning = useCallback((token: string) => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return;
    const delay = Math.max(0, expiryMs - Date.now() - WARN_BEFORE_EXPIRY_MS);
    warnTimerRef.current = setTimeout(() => {
      setSessionWarning(true);
      // Try to extend silently; if it fails the SessionGate countdown proceeds to logout
      void refreshTokens().then((ok) => {
        if (ok) setSessionWarning(false);
      });
    }, delay);
  }, []);

  const applyAuth = useCallback(
    (auth: AuthResponse) => {
      const nextUser: AuthUser = {
        userId: auth.userId,
        email: auth.email,
        role: auth.role,
        profileImageUrl: auth.profileImageUrl ?? null,
      };
      tokenRef.current = auth.accessToken;
      userRef.current = nextUser;
      setAccessToken(auth.accessToken);
      setUser(nextUser);
      setStatus("authenticated");
      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, auth.accessToken);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
      } catch {
        // storage unavailable — session lives in memory only
      }
      scheduleWarning(auth.accessToken);
    },
    [scheduleWarning]
  );

  const forceLogout = useCallback(
    (message?: string) => {
      const wasAuthenticated = userRef.current !== null;
      clearSession();
      if (wasAuthenticated && message) {
        toast.error("Session ended", message);
      }
    },
    [clearSession, toast]
  );

  // Bind the api client bridge exactly once
  useEffect(() => {
    bindAuthBridge({
      getAccessToken: () => tokenRef.current,
      setAuth: applyAuth,
      onSessionExpired: () => forceLogout("Please sign in again to continue."),
    });
  }, [applyAuth, forceLogout]);

  // Restore the session on first load via the HttpOnly refresh cookie
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void refreshTokens().then((ok) => {
      if (!ok) clearSession();
    });
  }, [clearSession]);

  // Recover the session when the tab regains focus with an expired token
  useEffect(() => {
    const onFocus = () => {
      const token = tokenRef.current;
      if (!token) return;
      const expiry = getTokenExpiryMs(token);
      if (expiry && expiry <= Date.now()) {
        void refreshTokens().then((ok) => {
          if (!ok) clearSession();
        });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [clearSession]);

  // Clear the expiry timer on unmount
  useEffect(() => {
    return () => {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    };
  }, []);

  const loginStaff = useCallback(
    async (email: string, password: string) => {
      applyAuth(await authApi.staffLogin(email, password));
    },
    [applyAuth]
  );

  const loginCustomer = useCallback(
    async (email: string, password: string) => {
      applyAuth(await authApi.customerLogin(email, password));
    },
    [applyAuth]
  );

  const registerCustomer = useCallback(
    async (input: RegisterInput) => {
      applyAuth(await authApi.registerCustomer(input));
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // clear the local session regardless of the server call result
    }
    clearSession();
  }, [clearSession]);

  const refreshSession = useCallback(async () => {
    const ok = await refreshTokens();
    if (ok) setSessionWarning(false);
    return ok;
  }, []);

  // Keep the cached session user in step with a freshly uploaded photo so any
  // shell avatar (e.g. the topbar account button) re-renders immediately.
  const setProfileImageUrl = useCallback((url: string | null) => {
    const current = userRef.current;
    if (!current) return;
    const nextUser: AuthUser = { ...current, profileImageUrl: url };
    userRef.current = nextUser;
    setUser(nextUser);
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    } catch {
      // storage unavailable — session lives in memory only
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      sessionWarning,
      loginStaff,
      loginCustomer,
      registerCustomer,
      logout,
      refreshSession,
      setProfileImageUrl,
    }),
    [
      status,
      user,
      accessToken,
      sessionWarning,
      loginStaff,
      loginCustomer,
      registerCustomer,
      logout,
      refreshSession,
      setProfileImageUrl,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

/** Redirect path for the login page matching the user's role */
export function loginPathForRole(role: string | undefined): string {
  return role === "CUSTOMER" ? "/customer/login" : "/staff/login";
}

