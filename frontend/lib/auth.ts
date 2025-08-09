"use client"
import { User } from "./types";

type AuthState = { token: string; user: User } | null;

const STORAGE_KEY = "auth_state";

export function saveAuth(state: AuthState) {
  if (typeof window === "undefined") return;
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function loadAuth(): AuthState {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function logout() {
  saveAuth(null);
}


