// Persistent list of MySQL connections, stored in localStorage.
// We deliberately store the full URL (including password) so the user can paste
// `mysql://root:passwort@host:3306/db` and have it work in one step. This is a
// local-only dev tool — the page is served from 127.0.0.1 and never leaves the
// machine.

const STORAGE_KEY = "webbase.connections.v1";
const ACTIVE_KEY = "webbase.connections.active";

export type Connection = {
  id: string;
  label: string;
  url: string;
};

export function loadConnections(): Connection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is Connection =>
        c && typeof c.id === "string" && typeof c.url === "string"
    );
  } catch {
    return [];
  }
}

export function saveConnections(list: Connection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string | null): void {
  if (id === null) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, id);
}

export function newId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// Best-effort label derived from a URL: "db @ host"
export function defaultLabel(url: string): string {
  try {
    const u = new URL(url);
    const db = u.pathname.replace(/^\//, "");
    const host = u.hostname || "localhost";
    return db ? `${db} @ ${host}` : host;
  } catch {
    return url;
  }
}
