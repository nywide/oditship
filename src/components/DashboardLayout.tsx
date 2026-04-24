import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X, UserCircle2 } from "lucide-react";
import { ProfileModal } from "@/components/dashboard/ProfileModal";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** When set, this item is only shown if profile.agent_pages?.[permKey] !== false (for agents) */
  permKey?: string;
}

interface Props {
  title: string;
  nav: NavItem[];
}

export const DashboardLayout = ({ title, nav }: Props) => {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isAgent = role === "agent" || profile?.agent_of != null;
  const agentPages = (profile?.agent_pages ?? null) as Record<string, boolean> | null;

  const visibleNav = nav.filter((item) => {
    if (!isAgent || !item.permKey || !agentPages) return true;
    return agentPages[item.permKey] !== false;
  });

  return (
    <div className="min-h-screen bg-secondary/30 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <Logo />
          <button className="lg:hidden text-sidebar-foreground" onClick={() => setOpen(false)} aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-3 text-xs uppercase tracking-wider text-sidebar-foreground/60">{title}</div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-sm font-semibold truncate">{profile?.full_name || profile?.username}</div>
          <div className="text-xs text-sidebar-foreground/60 mb-3 capitalize">{role}</div>
          <Button variant="outline" size="sm" className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <button className="lg:hidden p-2" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg truncate">{title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{profile?.username}</span>
            <Button variant="ghost" size="icon" onClick={() => setProfileOpen(true)} aria-label="Mon profil">
              <UserCircle2 className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
};
