import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preloadStatusBadgeOverrides } from "./lib/statusBadgeOverrides";

preloadStatusBadgeOverrides().catch(() => { /* */ });

// --- Impersonation isolation bootstrap ---
// A tab is in "impersonation mode" if its sessionStorage carries the
// "sb-impersonating" flag (set permanently for that tab by /impersonate)
// OR if its window.name marks it as such (survives reloads & navigations).
// In that mode, all reads/writes of the Supabase auth-token storage key
// are redirected from localStorage to sessionStorage so the original admin
// tab (which uses localStorage) remains completely isolated.
(() => {
  try {
    if (typeof window === "undefined") return;
    const isImpersonating =
      sessionStorage.getItem("sb-impersonating") === "1" ||
      window.name === "odit-impersonation";
    if (!isImpersonating) return;
    // Persist marker in window.name so subsequent navigations remain isolated.
    window.name = "odit-impersonation";
    sessionStorage.setItem("sb-impersonating", "1");

    const isAuthKey = (key: string) =>
      key.startsWith("sb-") && key.includes("-auth-token");

    const ls = window.localStorage;
    const ss = window.sessionStorage;
    const origGet = ls.getItem.bind(ls);
    const origSet = ls.setItem.bind(ls);
    const origRemove = ls.removeItem.bind(ls);

    ls.getItem = (key: string) => (isAuthKey(key) ? ss.getItem(key) : origGet(key));
    ls.setItem = (key: string, value: string) => {
      if (isAuthKey(key)) ss.setItem(key, value);
      else origSet(key, value);
    };
    ls.removeItem = (key: string) => {
      if (isAuthKey(key)) ss.removeItem(key);
      else origRemove(key);
    };
  } catch {
    /* no-op */
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
