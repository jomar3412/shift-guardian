import { useState, useEffect } from "react";
import { useShift } from "@/context/ShiftContext";
import { EmployeeCard } from "@/components/EmployeeCard";
import { AddEmployeeDialog } from "@/components/AddEmployeeDialog";
import { LunchQueue } from "@/components/LunchQueue";
import { CoverageIndicator } from "@/components/CoverageIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Settings, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { employees, settings, updateSettings } = useShift();
  const [, setTick] = useState(0);

  // Force re-render every 10 seconds for live countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const activeEmployees = employees.filter(e => e.status === "active");
  const absentEmployees = employees.filter(e => e.status === "absent");
  const now = new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-dashboard-header text-dashboard-header-foreground">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-7 w-7" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">Shift Guard</h1>
                <p className="text-xs opacity-70">Meal Compliance Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm opacity-70">
                <Clock className="h-4 w-4" />
                {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-dashboard-header-foreground hover:bg-primary/20">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label>Minimum Active Cashiers</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={settings.minCashiers}
                        onChange={e => updateSettings({ minCashiers: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Grace Period (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={settings.gracePeriodMinutes}
                        onChange={e => updateSettings({ gracePeriodMinutes: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Overtime Threshold (hours)</Label>
                      <Input
                        type="number"
                        min={6}
                        max={12}
                        value={settings.overtimeThresholdHours}
                        onChange={e => updateSettings({ overtimeThresholdHours: parseInt(e.target.value) || 8 })}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left: Employee list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Today's Shift
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activeEmployees.length} active)
                </span>
              </h2>
              <AddEmployeeDialog />
            </div>

            {employees.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-lg font-medium text-foreground">No employees added</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add employees to start tracking meal compliance
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
                {absentEmployees.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground pt-2">Absent</h3>
                    {absentEmployees.map(emp => (
                      <EmployeeCard key={emp.id} employee={emp} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <aside className="space-y-4">
            <CoverageIndicator />
            <LunchQueue />
          </aside>
        </div>
      </main>
    </div>
  );
}
