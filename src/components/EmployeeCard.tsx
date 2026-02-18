import { useState, useEffect } from "react";
import { Employee, ComplianceInfo } from "@/types/shift";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { getComplianceInfo, getMinutesToFifthHour, checkCoverageForLunch } from "@/lib/compliance";
import { CoverageDialog } from "@/components/CoverageDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Coffee, UtensilsCrossed, UserX, Play, Square, AlertTriangle, LogOut, ChevronDown, ChevronUp, Shield } from "lucide-react";
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
  const { startLunch, endLunch, startBreak, endBreak, clockOut, changeAssignment, employees, settings, getCoverageFor, getCoveringBy, addCoverage } = useShift();
  const { subRoles, employeeRecords, getPrimaryRoleById, getQualifiedSubRoles } = useApp();
  const { isAdmin } = useAuth();
  const [info, setInfo] = useState<ComplianceInfo>(() => getComplianceInfo(employee, settings));
  const [expanded, setExpanded] = useState(false);
  const [showManualLunch, setShowManualLunch] = useState(false);
  const [manualLunchMode, setManualLunchMode] = useState<"start" | "end">("start");
  const [manualLunchTime, setManualLunchTime] = useState("");
  const [coverageDialogOpen, setCoverageDialogOpen] = useState(false);
  const [coverageReason, setCoverageReason] = useState<"lunch" | "break">("lunch");

  useEffect(() => {
    const interval = setInterval(() => setInfo(getComplianceInfo(employee, settings)), 5000);
    setInfo(getComplianceInfo(employee, settings));
    return () => clearInterval(interval);
  }, [employee, settings]);

  useEffect(() => {
    if (employee.lunchStatus !== "not_started" || employee.status !== "active") return;
    const mins = getMinutesToFifthHour(employee, settings);
    if (mins <= 0) toast.error(`⚠️ VIOLATION: ${employee.name} has passed meal deadline without lunch!`);
    else if (mins <= settings.criticalMinutesBeforeDeadline) toast.warning(`🔴 CRITICAL: ${employee.name} - ${Math.round(mins)}min to meal deadline!`);
    else if (mins <= settings.urgentMinutesBeforeDeadline) toast.warning(`🟠 URGENT: ${employee.name} - ${Math.round(mins)}min to meal deadline`);
  }, [info.level, employee, settings]);

  useEffect(() => {
    if (!showManualLunch) return;
    setManualLunchMode(employee.lunchStatus === "on_lunch" ? "end" : "start");
  }, [showManualLunch, employee.lunchStatus]);

  const record = employeeRecords.find(r => r.id === employee.employeeRecordId);
  const qualifiedSubRoles = record ? getQualifiedSubRoles(record) : [];
  const currentSubRole = subRoles.find(r => r.id === employee.currentAssignmentId);
  const primaryRole = getPrimaryRoleById(employee.primaryRoleId);

  // Coverage badges
  const coverageFor = getCoverageFor(employee.id);
  const coveringBy = getCoveringBy(employee.id);
  const coverByName = coverageFor ? employees.find(e => e.id === coverageFor.coveredById)?.name : null;
  const coveringForName = coveringBy ? employees.find(e => e.id === coveringBy.employeeId)?.name : null;
  const coveringRoleName = coveringBy ? subRoles.find(r => r.id === coveringBy.coverRole)?.name : null;

  const handleAssignLunchWithCoverage = () => {
    if (!isAdmin) return;
    const { safe, warnings } = checkCoverageForLunch(employees, employee.id, subRoles);
    if (!safe) {
      toast.warning(warnings[0]);
    }
    setCoverageReason("lunch");
    setCoverageDialogOpen(true);
  };

  const handleBreakWithCoverage = () => {
    if (!isAdmin) return;
    setCoverageReason("break");
    setCoverageDialogOpen(true);
  };

  const handleCoverageConfirm = (coveredById: string, coverRoleId: string) => {
    addCoverage({
      employeeId: employee.id,
      coveredById,
      originalRole: employee.currentAssignmentId,
      coverRole: coverRoleId,
      reason: coverageReason,
    });
    if (coverageReason === "lunch") {
      startLunch(employee.id);
      toast.success(`${employee.name} started lunch`);
    } else {
      startBreak(employee.id);
      toast.success(`${employee.name} started break`);
    }
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
    if (manualLunchMode === "start") {
      startLunch(employee.id, d.getTime());
      toast.success(`${employee.name} lunch start logged at ${manualLunchTime}`);
    } else {
      endLunch(employee.id, d.getTime());
      toast.success(`${employee.name} lunch end logged at ${manualLunchTime}`);
    }
    setShowManualLunch(false);
    setManualLunchTime("");
  };

  // Inactive states
  if (employee.status === "absent" || employee.status === "clocked_out" || employee.status === "off") {
    const scheduledLabel = `${employee.scheduledStart} - ${employee.scheduledEnd}`;
    const offRoleName = currentSubRole?.name || "—";
    return (
      <div className="rounded-lg border border-border bg-card p-3 opacity-50">
        <div className="flex items-center gap-3">
          {employee.status === "absent" ? <UserX className="h-4 w-4 text-muted-foreground" /> : <LogOut className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium text-foreground text-sm">{employee.name}</span>
          <span className="compliance-badge bg-muted text-muted-foreground text-[10px]">
            {employee.status === "absent" ? "Absent" : employee.status === "clocked_out" ? "Clocked Out" : "Scheduled"}
          </span>
        </div>
        {employee.status === "off" && (
          <div className="mt-1 text-xs text-muted-foreground">
            {offRoleName} • {scheduledLabel}
          </div>
        )}
      </div>
    );
  }

  const colors = complianceColors[info.level] || complianceColors.safe;
  const isOnBreak = employee.breakStatus === "on_break";

  return (
    <>
      <div
        className={`rounded-lg border-l-4 ${colors.border} border border-border bg-card ${colors.bg} transition-all`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Collapsed view */}
        <div className="px-3 py-2.5 flex items-center gap-3 cursor-pointer select-none">
          <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isOnBreak ? breakDot : colors.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm truncate">{employee.name}</span>
              <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">{primaryRole?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium">{currentSubRole?.name || "—"}</span>
              {isOnBreak && <span className="text-primary font-medium">On Break</span>}
              {employee.scheduledLunch && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5">
                  <UtensilsCrossed className="h-3 w-3" /> {employee.scheduledLunch}
                </span>
              )}
              {employee.lunchStatus === "returned" && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-compliance-safe-bg text-compliance-safe rounded-full px-2 py-0.5">
                  <UtensilsCrossed className="h-3 w-3" /> Lunch done
                </span>
              )}
              {employee.breakStatus === "returned" && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  <Coffee className="h-3 w-3" /> Break done
                </span>
              )}
              {/* Coverage badges */}
              {coverByName && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-accent text-accent-foreground rounded-full px-2 py-0.5">
                  <Shield className="h-3 w-3" /> Covered by: {coverByName}
                </span>
              )}
              {coveringForName && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  <Shield className="h-3 w-3" /> Covering: {coveringRoleName} ({coveringForName})
                </span>
              )}
            </div>
          </div>
          <ComplianceBadge info={info} />
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </div>

        {/* Expanded view */}
        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoChip label="Assignment" value={currentSubRole?.name || "—"} />
              <InfoChip label="Shift" value={`${employee.scheduledStart} - ${employee.scheduledEnd}`} />
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) return;
                  if (employee.lunchStatus === "not_started") handleAssignLunchWithCoverage();
                  if (employee.lunchStatus === "pending") handleStartLunch();
                }}
                className={`text-left rounded-md px-2 py-1.5 ${
                  isAdmin && (employee.lunchStatus === "not_started" || employee.lunchStatus === "pending")
                    ? "bg-muted hover:bg-muted/80"
                    : "bg-muted"
                }`}
              >
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Scheduled Lunch</div>
                <div className="text-xs font-mono font-medium text-foreground">{employee.scheduledLunch || "—"}</div>
                {isAdmin && employee.lunchStatus === "not_started" && (
                  <div className="text-[10px] text-primary mt-0.5">Tap to assign lunch</div>
                )}
                {isAdmin && employee.lunchStatus === "pending" && (
                  <div className="text-[10px] text-primary mt-0.5">Tap to start lunch</div>
                )}
              </button>
            </div>

            {/* Change assignment - admin only */}
            {isAdmin && qualifiedSubRoles.length > 1 && (
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

            {/* Action buttons - admin only */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {employee.lunchStatus === "not_started" && (
                  <Button size="default" className="gap-2 flex-1 min-w-[120px] bg-compliance-safe text-compliance-safe-foreground hover:bg-compliance-safe/90" onClick={handleStartLunch}>
                    <Play className="h-4 w-4" />
                    Start Lunch
                  </Button>
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

                {employee.lunchStatus !== "returned" && (
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShowManualLunch(!showManualLunch)}>
                    <Clock className="h-3 w-3 mr-1" />
                    Manual Override
                  </Button>
                )}
              </div>
            )}

            {isAdmin && showManualLunch && (
              <div className="flex flex-wrap gap-2 items-center">
                {employee.lunchStatus === "on_lunch" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setManualLunchMode("end")}
                    className={manualLunchMode === "end" ? "ring-2 ring-primary" : ""}
                  >
                    Log Lunch End
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setManualLunchMode("start")}
                    className={manualLunchMode === "start" ? "ring-2 ring-primary" : ""}
                  >
                    Log Lunch Start
                  </Button>
                )}
                <Input type="time" value={manualLunchTime} onChange={e => setManualLunchTime(e.target.value)} className="h-9 text-sm flex-1" />
                <Button size="sm" onClick={handleManualLunch} disabled={!manualLunchTime}>Confirm</Button>
              </div>
            )}

            {isAdmin && (
              <div className="flex gap-2">
                {employee.breakStatus === "not_started" && employee.lunchStatus !== "on_lunch" && (
                  <Button size="sm" variant="secondary" className="gap-1.5 flex-1" onClick={handleBreakWithCoverage}>
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
            )}
          </div>
        )}
      </div>

      <CoverageDialog
        open={coverageDialogOpen}
        onOpenChange={setCoverageDialogOpen}
        employee={employee}
        reason={coverageReason}
        onConfirm={handleCoverageConfirm}
      />
    </>
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
