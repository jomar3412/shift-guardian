import { useState, useEffect } from "react";
import { Employee, ComplianceInfo } from "@/types/shift";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { getComplianceInfo, formatDuration, getMinutesToFifthHour, checkCoverageForLunch } from "@/lib/compliance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Coffee, UtensilsCrossed, UserX, Play, Square, AlertTriangle, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const complianceColors: Record<string, { border: string; bg: string; dot: string }> = {
  safe: { border: "border-l-compliance-safe", bg: "", dot: "bg-compliance-safe" },
  warning: { border: "border-l-compliance-warning", bg: "bg-compliance-warning-bg", dot: "bg-compliance-warning" },
  urgent: { border: "border-l-compliance-urgent", bg: "bg-compliance-urgent-bg", dot: "bg-compliance-urgent" },
  critical: { border: "border-l-compliance-critical", bg: "bg-compliance-critical-bg animate-pulse-alert", dot: "bg-compliance-critical" },
  violation: { border: "border-l-compliance-violation", bg: "bg-compliance-violation-bg animate-pulse-alert", dot: "bg-compliance-violation" },
};

const breakDot = "bg-primary";

export function EmployeeCard({ employee }: { employee: Employee }) {
  const { assignLunch, startLunch, endLunch, startBreak, endBreak, clockOut, changeAssignment, employees } = useShift();
  const { subRoles, employeeRecords, getPrimaryRoleById, getQualifiedSubRoles } = useApp();
  const [info, setInfo] = useState<ComplianceInfo>(() => getComplianceInfo(employee));
  const [expanded, setExpanded] = useState(false);
  const [showManualLunch, setShowManualLunch] = useState(false);
  const [manualLunchTime, setManualLunchTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setInfo(getComplianceInfo(employee)), 5000);
    setInfo(getComplianceInfo(employee));
    return () => clearInterval(interval);
  }, [employee]);

  useEffect(() => {
    if (employee.lunchStatus !== "not_started" || employee.status !== "active") return;
    const mins = getMinutesToFifthHour(employee);
    if (mins <= 0) toast.error(`⚠️ VIOLATION: ${employee.name} has exceeded 5 hours without lunch!`);
    else if (mins <= 15) toast.warning(`🔴 CRITICAL: ${employee.name} - ${Math.round(mins)}min to 5th hour!`);
    else if (mins <= 30) toast.warning(`🟠 URGENT: ${employee.name} - ${Math.round(mins)}min to 5th hour`);
  }, [info.level]);

  const record = employeeRecords.find(r => r.id === employee.employeeRecordId);
  const qualifiedSubRoles = record ? getQualifiedSubRoles(record) : [];
  const currentSubRole = subRoles.find(r => r.id === employee.currentAssignmentId);
  const primaryRole = getPrimaryRoleById(employee.primaryRoleId);

  const handleAssignLunch = () => {
    const { safe, warnings } = checkCoverageForLunch(employees, employee.id, subRoles);
    if (!safe) {
      toast.warning(warnings[0], {
        action: { label: "Send Anyway", onClick: () => assignLunch(employee.id) },
      });
      return;
    }
    assignLunch(employee.id);
  };

  const handleStartLunch = () => {
    startLunch(employee.id);
    toast.success(`${employee.name} started lunch`);
  };

  const handleManualLunch = () => {
    if (!manualLunchTime) return;
    const [h, m] = manualLunchTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    startLunch(employee.id, d.getTime());
    toast.success(`${employee.name} lunch logged at ${manualLunchTime}`);
    setShowManualLunch(false);
    setManualLunchTime("");
  };

  // Inactive states - minimal card
  if (employee.status === "absent" || employee.status === "clocked_out") {
    return (
      <div className="rounded-lg border border-border bg-card p-3 opacity-50">
        <div className="flex items-center gap-3">
          {employee.status === "absent" ? <UserX className="h-4 w-4 text-muted-foreground" /> : <LogOut className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium text-foreground text-sm">{employee.name}</span>
          <span className="compliance-badge bg-muted text-muted-foreground text-[10px]">
            {employee.status === "absent" ? "Absent" : "Clocked Out"}
          </span>
        </div>
      </div>
    );
  }

  const colors = complianceColors[info.level] || complianceColors.safe;
  const isOnBreak = employee.breakStatus === "on_break";

  return (
    <div
      className={`rounded-lg border-l-4 ${colors.border} border border-border bg-card ${colors.bg} transition-all`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed view - always visible */}
      <div className="px-3 py-2.5 flex items-center gap-3 cursor-pointer select-none">
        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isOnBreak ? breakDot : colors.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm truncate">{employee.name}</span>
            <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">{primaryRole?.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{currentSubRole?.name || "—"}</span>
            {info.minutesToFifthHour !== Infinity && info.minutesToFifthHour > 0 && (
              <span className={`font-mono ${info.level === "critical" || info.level === "violation" ? "text-compliance-critical font-bold" : ""}`}>
                {formatDuration(info.minutesToFifthHour)} to 5th
              </span>
            )}
            {info.level === "violation" && <span className="text-compliance-violation font-bold">VIOLATION</span>}
            {isOnBreak && <span className="text-primary font-medium">On Break</span>}
          </div>
        </div>
        <ComplianceBadge info={info} />
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3" onClick={e => e.stopPropagation()}>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoChip label="Assignment" value={currentSubRole?.name || "—"} />
            <InfoChip label="Hours Worked" value={formatDuration(info.hoursWorked * 60)} />
            <InfoChip
              label="5th Hour In"
              value={info.minutesToFifthHour === Infinity ? "—" : info.minutesToFifthHour <= 0 ? "PAST" : formatDuration(info.minutesToFifthHour)}
              highlight={info.minutesToFifthHour < 60 && info.minutesToFifthHour > 0}
            />
            <InfoChip label="Sched. Lunch" value={employee.scheduledLunch || "—"} />
          </div>

          {/* Change assignment */}
          {qualifiedSubRoles.length > 1 && (
            <Select value={employee.currentAssignmentId} onValueChange={(v) => changeAssignment(employee.id, v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Change Assignment" />
              </SelectTrigger>
              <SelectContent>
                {qualifiedSubRoles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Lunch */}
            {employee.lunchStatus === "not_started" && (
              <>
                <Button size="default" variant="outline" className="gap-2 flex-1 min-w-[120px]" onClick={handleAssignLunch}>
                  <UtensilsCrossed className="h-4 w-4" />
                  Assign Lunch
                </Button>
                <Button size="default" className="gap-2 flex-1 min-w-[120px] bg-compliance-safe text-compliance-safe-foreground hover:bg-compliance-safe/90" onClick={handleStartLunch}>
                  <Play className="h-4 w-4" />
                  Start Lunch
                </Button>
              </>
            )}
            {employee.lunchStatus === "pending" && (
              <>
                <Button size="default" className="gap-2 flex-1 bg-compliance-safe text-compliance-safe-foreground hover:bg-compliance-safe/90" onClick={handleStartLunch}>
                  <Play className="h-4 w-4" />
                  Start Lunch Now
                </Button>
                <div className="w-full text-xs text-compliance-warning font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Assigned — waiting to leave
                </div>
              </>
            )}
            {employee.lunchStatus === "on_lunch" && (
              <Button size="default" className="gap-2 flex-1" onClick={() => endLunch(employee.id)}>
                <Square className="h-4 w-4" />
                End Lunch
              </Button>
            )}
            {employee.lunchStatus === "returned" && (
              <span className="compliance-badge bg-compliance-safe-bg text-compliance-safe text-xs">✓ Lunch done</span>
            )}

            {/* Manual lunch entry */}
            {(employee.lunchStatus === "not_started" || employee.lunchStatus === "pending") && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => setShowManualLunch(!showManualLunch)}
              >
                <Clock className="h-3 w-3 mr-1" />
                Enter Time
              </Button>
            )}
          </div>

          {/* Manual lunch time entry */}
          {showManualLunch && (
            <div className="flex gap-2 items-center">
              <Input
                type="time"
                value={manualLunchTime}
                onChange={e => setManualLunchTime(e.target.value)}
                className="h-9 text-sm flex-1"
              />
              <Button size="sm" onClick={handleManualLunch} disabled={!manualLunchTime}>
                Confirm
              </Button>
            </div>
          )}

          {/* Break + Clock out row */}
          <div className="flex gap-2">
            {employee.breakStatus === "not_started" && employee.lunchStatus !== "on_lunch" && (
              <Button size="sm" variant="secondary" className="gap-1.5 flex-1" onClick={() => startBreak(employee.id)}>
                <Coffee className="h-3.5 w-3.5" />
                Log Break
              </Button>
            )}
            {employee.breakStatus === "on_break" && (
              <Button size="sm" variant="secondary" className="gap-1.5 flex-1" onClick={() => endBreak(employee.id)}>
                <Square className="h-3.5 w-3.5" />
                End Break
              </Button>
            )}
            {employee.breakStatus === "returned" && (
              <span className="text-xs text-muted-foreground self-center">Break done</span>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              clockOut(employee.id);
              toast.success(`${employee.name} clocked out`);
            }}>
              <LogOut className="h-3.5 w-3.5" />
              Clock Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComplianceBadge({ info }: { info: ComplianceInfo }) {
  const styles: Record<string, string> = {
    safe: "bg-compliance-safe-bg text-compliance-safe",
    warning: "bg-compliance-warning-bg text-compliance-warning",
    urgent: "bg-compliance-urgent-bg text-compliance-urgent",
    critical: "bg-compliance-critical-bg text-compliance-critical",
    violation: "bg-compliance-violation-bg text-compliance-violation",
  };
  return <span className={`compliance-badge text-[10px] ${styles[info.level]}`}>{info.label}</span>;
}

function InfoChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-1.5 ${highlight ? "bg-compliance-warning-bg" : "bg-muted"}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs font-mono font-medium ${highlight ? "text-compliance-warning" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
