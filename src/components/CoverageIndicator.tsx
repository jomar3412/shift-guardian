import { useShift } from "@/context/ShiftContext";
import { getActiveCashierCount } from "@/lib/compliance";
import { Users, AlertTriangle } from "lucide-react";

export function CoverageIndicator() {
  const { employees, settings } = useShift();
  const active = getActiveCashierCount(employees);
  const isBelowMin = active < settings.minCashiers;

  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
      isBelowMin
        ? "bg-compliance-critical-bg text-compliance-critical"
        : "bg-compliance-safe-bg text-compliance-safe"
    }`}>
      {isBelowMin ? (
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <Users className="h-5 w-5 flex-shrink-0" />
      )}
      <div>
        <div className="text-sm font-semibold">
          {active} active cashier{active !== 1 ? "s" : ""}
        </div>
        <div className="text-xs opacity-80">
          Minimum: {settings.minCashiers}
        </div>
      </div>
    </div>
  );
}
