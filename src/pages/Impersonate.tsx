import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { AppLoading } from "@/components/AppLoading";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Impersonate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const access_token = searchParams.get("access_token");
    const refresh_token = searchParams.get("refresh_token");
    if (!access_token || !refresh_token) {
      navigate("/login", { replace: true });
      return;
    }

    // Mark this tab permanently (window.name + sessionStorage) so the bootstrap
    // in main.tsx redirects supabase auth storage to sessionStorage on every
    // reload of THIS tab. The admin tab is unaffected (uses localStorage).
    window.name = "odit-impersonation";
    sessionStorage.setItem("sb-impersonating", "1");

    // Tab-scoped storage so writes never touch the admin tab's localStorage.
    const tabStorage: Storage = {
      length: 0,
      clear: () => sessionStorage.clear(),
      key: (i: number) => sessionStorage.key(i),
      getItem: (k: string) => sessionStorage.getItem(k),
      setItem: (k: string, v: string) => sessionStorage.setItem(k, v),
      removeItem: (k: string) => sessionStorage.removeItem(k),
    };

    const tempClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: tabStorage,
        persistSession: true,
        autoRefreshToken: false,
      },
    });

    tempClient.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) throw error;
        // Hard-reload into the dashboard so the global client picks up the
        // session from sessionStorage (via the localStorage interception).
        window.location.replace("/dashboard");
      })
      .catch(() => {
        sessionStorage.removeItem("sb-impersonating");
        navigate("/login", { replace: true });
      });
  }, [searchParams, navigate]);

  return <AppLoading label="Chargement de la session…" />;
}
