import { supabase } from "@/integrations/supabase/client";

// Lightweight in-memory + sessionStorage cache for `app_settings` rows.
// Goal: avoid hitting the DB on every page navigation for keys that change rarely.

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const memCache = new Map<string, { value: any; expires: number }>();
const inflight = new Map<string, Promise<any>>();

function readSession(key: string): { value: any; expires: number } | null {
  try {
    const raw = sessionStorage.getItem(`app_settings:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.expires !== "number") return null;
    if (parsed.expires < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(key: string, entry: { value: any; expires: number }) {
  try {
    sessionStorage.setItem(`app_settings:${key}`, JSON.stringify(entry));
  } catch {
    /* ignore quota */
  }
}

export async function getAppSetting<T = any>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memCache.get(key);
  if (mem && mem.expires > now) return mem.value as T;
  const ses = readSession(key);
  if (ses) {
    memCache.set(key, ses);
    return ses.value as T;
  }
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = (async () => {
    const { data } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    const value = data?.value ?? null;
    const entry = { value, expires: Date.now() + TTL_MS };
    memCache.set(key, entry);
    writeSession(key, entry);
    inflight.delete(key);
    return value;
  })();
  inflight.set(key, p);
  return p;
}

export function invalidateAppSetting(key: string) {
  memCache.delete(key);
  try { sessionStorage.removeItem(`app_settings:${key}`); } catch { /* ignore */ }
}
