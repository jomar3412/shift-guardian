import { useState, useEffect } from "react";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { EmployeeCard } from "@/components/EmployeeCard";
import { LunchQueue } from "@/components/LunchQueue";
import { CoverageIndicator } from "@/components/CoverageIndicator";
import { Shield } from "lucide-react";

export default function DashboardPage() {
  const { employees } = useShift();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const activeEmployees = employees.filter(e => e.status === "active");
  const onLunchEmployees = employees.filter(e => e.lunchStatus === "on_lunch");
  const absentEmployees = employees.filter(e => e.status === "absent");
  const clockedOutEmployees = employees.filter(e => e.status === "clocked_out");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Live Operations
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({activeEmployees.length} active)
            </span>
          </h2>
        </div>

        {employees.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground">No active shifts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add shifts from the Manage Shifts page to start tracking compliance
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeEmployees.map(emp => (
              <EmployeeCard key={emp.id} employee={emp} />
            ))}
            {onLunchEmployees.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground pt-2">On Lunch</h3>
                {onLunchEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </>
            )}
            {absentEmployees.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground pt-2">Absent</h3>
                {absentEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </>
            )}
            {clockedOutEmployees.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground pt-2">Clocked Out</h3>
                {clockedOutEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <CoverageIndicator />
        <LunchQueue />
      </aside>
    </div>
  );
}
