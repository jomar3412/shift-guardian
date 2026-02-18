import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, CalendarClock, Users, Tags, Settings, Clock, LogOut, Scale } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { appSettings } = useApp();
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: appSettings.timeFormat === "12h",
  });

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", show: true },
    { to: "/shifts", icon: CalendarClock, label: "Manage Shifts", show: isAdmin },
    { to: "/employees", icon: Users, label: "Employees", show: isAdmin },
    { to: "/roles", icon: Tags, label: "Roles", show: isAdmin },
    { to: "/compliance", icon: Scale, label: "Compliance", show: isAdmin },
    { to: "/settings", icon: Settings, label: "Settings", show: isAdmin },
  ].filter(item => item.show);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-dashboard-header text-dashboard-header-foreground sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-tight">Shift Guard</h1>
                <p className="text-[10px] uppercase tracking-wider opacity-60">Meal Compliance Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm opacity-70">
                <Clock className="h-4 w-4" />
                {timeStr}
              </div>
              {profile && (
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-60 hidden sm:inline">{profile.full_name}</span>
                  <span className="text-[10px] uppercase bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                    {profile.role}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-dashboard-header-foreground/60 hover:text-dashboard-header-foreground" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                    isActive
                      ? "border-primary-foreground text-dashboard-header-foreground"
                      : "border-transparent text-dashboard-header-foreground/50 hover:text-dashboard-header-foreground/80"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
