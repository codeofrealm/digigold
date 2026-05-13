"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "user" | "admin";

export interface AuthUser {
  phone: string;
  name: string;
  role: UserRole;
  pinSet: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, name: string, role: UserRole) => void;
  logout: () => void;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  hasPin: () => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const AUTH_KEY = "dg-auth-v2";
const PIN_KEY  = "dg-pin-v1"; // stored separately, hashed

// Simple hash — XOR + base36 (not cryptographic, just obfuscation for demo)
function hashPin(pin: string, phone: string): string {
  let h = 0;
  const s = pin + phone;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  function login(phone: string, name: string, role: UserRole) {
    // Check if PIN already set for this phone
    const pinData = localStorage.getItem(PIN_KEY);
    const pinSet  = pinData ? JSON.parse(pinData).phone === phone : false;
    const u: AuthUser = { phone, name, role, pinSet };
    setUser(u);
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    // Keep PIN — user needs it to log back in
  }

  function setPin(pin: string) {
    if (!user) return;
    const hashed = hashPin(pin, user.phone);
    localStorage.setItem(PIN_KEY, JSON.stringify({ phone: user.phone, hash: hashed }));
    const updated = { ...user, pinSet: true };
    setUser(updated);
    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  }

  function verifyPin(pin: string): boolean {
    if (!user) return false;
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return false;
    const { phone, hash } = JSON.parse(raw);
    if (phone !== user.phone) return false;
    return hashPin(pin, user.phone) === hash;
  }

  function hasPin(): boolean {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw || !user) return false;
    return JSON.parse(raw).phone === user.phone;
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, setPin, verifyPin, hasPin }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
