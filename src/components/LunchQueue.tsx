import { useShift } from "@/context/ShiftContext";
import { getLunchPriorityQueue, getComplianceInfo, formatDuration } from "@/lib/compliance";
import { Clock, ChevronRight } from "lucide-react";

export function LunchQueue() {
  const { employees } = useShift();
  const queue = getLunchPriorityQueue(employees);

  if (queue.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No employees waiting for lunch
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clock className="h-4 w-4" />
        Suggested Lunch Order
      </h3>
      <div className="space-y-1">
        {queue.map((emp, i) => {
          const info = getComplianceInfo(emp);
          const bgClass = {
            safe: "bg-compliance-safe-bg",
            warning: "bg-compliance-warning-bg",
            urgent: "bg-compliance-urgent-bg",
            critical: "bg-compliance-critical-bg",
            violation: "bg-compliance-violation-bg",
          }[info.level];
          const textClass = {
            safe: "text-compliance-safe",
            warning: "text-compliance-warning",
            urgent: "text-compliance-urgent",
            critical: "text-compliance-critical",
            violation: "text-compliance-violation",
          }[info.level];

          return (
            <div
              key={emp.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${bgClass}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${textClass}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{emp.name}</div>
                <div className={`text-xs font-medium ${textClass}`}>
                  {info.minutesToFifthHour <= 0
                    ? "VIOLATION"
                    : `${formatDuration(info.minutesToFifthHour)} to 5th hour`}
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${textClass}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
