import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { getActiveCountByRole } from "@/lib/compliance";
import { Users, AlertTriangle } from "lucide-react";

export function CoverageIndicator() {
  const { employees } = useShift();
  const { roles } = useApp();

  const rolesWithCoverage = roles.filter(r => r.coverageProtection);

  if (rolesWithCoverage.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Users className="h-4 w-4" />
        Coverage Status
      </h3>
      <div className="space-y-1.5">
        {rolesWithCoverage.map(role => {
          const active = getActiveCountByRole(employees, role.id);
          const isBelowMin = active < role.minCoverage;
          return (
            <div
              key={role.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isBelowMin ? "bg-compliance-critical-bg text-compliance-critical" : "bg-compliance-safe-bg text-compliance-safe"
              }`}
            >
              {isBelowMin ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <Users className="h-4 w-4 flex-shrink-0" />}
              <div className="flex-1">
                <div className="text-sm font-semibold">{role.name}</div>
                <div className="text-xs opacity-80">{active} / {role.minCoverage} min</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
