export type AppSession = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "TECH" | "CASHIER";
    tenant: string;
    branch: string;
  };
};

const SESSION_KEY = "fixflow-saas-session";

export function getStoredSession(): AppSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AppSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
