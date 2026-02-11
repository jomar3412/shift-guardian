import { NavLink, Outlet } from "react-router-dom";
import { Shield, LayoutDashboard, CalendarClock, Users, Tags, Settings, Clock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/shifts", icon: CalendarClock, label: "Manage Shifts" },
  { to: "/employees", icon: Users, label: "Employees" },
  { to: "/roles", icon: Tags, label: "Roles" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppLayout() {
  const { appSettings } = useApp();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: appSettings.timeFormat === "12h",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top header bar */}
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
            <div className="flex items-center gap-2 text-sm opacity-70">
              <Clock className="h-4 w-4" />
              {timeStr}
            </div>
          </div>
        </div>

        {/* Navigation */}
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

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
