import { useState, useEffect } from "react";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { EmployeeCard } from "@/components/EmployeeCard";
import { LunchQueue } from "@/components/LunchQueue";
import { CoverageIndicator } from "@/components/CoverageIndicator";
import { SearchBar } from "@/components/SearchBar";
import { QuickAddShift } from "@/components/QuickAddShift";
import { sortByCompliancePriority } from "@/lib/compliance";
import { Shield } from "lucide-react";
import { ShiftAssistant } from "@/components/ShiftAssistant";

export default function DashboardPage() {
  const { employees } = useShift();
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const sorted = sortByCompliancePriority(employees);
  const filtered = search
    ? sorted.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const activeEmployees = filtered.filter(e => e.status === "active");
  const onLunchEmployees = filtered.filter(e => e.lunchStatus === "on_lunch");
  const inactiveEmployees = filtered.filter(e => e.status === "absent" || e.status === "clocked_out");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Search employees..." />
          </div>
          <QuickAddShift />
        </div>

        {employees.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground">No active shifts</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add shifts from Manage Shifts or use the + button above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeEmployees.map(emp => (
              <EmployeeCard key={emp.id} employee={emp} />
            ))}
            {onLunchEmployees.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-muted-foreground pt-1 uppercase tracking-wider">On Lunch</h3>
                {onLunchEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </>
            )}
            {inactiveEmployees.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-muted-foreground pt-1 uppercase tracking-wider">Off / Clocked Out</h3>
                {inactiveEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-4 hidden lg:block">
        <CoverageIndicator />
        <LunchQueue />
      </aside>

      {/* Mobile coverage/queue - shown below on small screens */}
      <div className="lg:hidden space-y-4">
        <CoverageIndicator />
        <LunchQueue />
      </div>

      <ShiftAssistant />
    </div>
  );
}
