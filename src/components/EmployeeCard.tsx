import { useState, useEffect } from "react";
import { Employee, ComplianceInfo } from "@/types/shift";
import { useShift } from "@/context/ShiftContext";
import { getComplianceInfo, formatTime, formatDuration, getHoursWorked, getMinutesToFifthHour, getActiveCashierCount } from "@/lib/compliance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Clock, Coffee, UtensilsCrossed, UserX, Pencil, Play, Square, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const complianceBorderColors: Record<string, string> = {
  safe: "border-l-compliance-safe",
  warning: "border-l-compliance-warning",
  urgent: "border-l-compliance-urgent",
  critical: "border-l-compliance-critical",
  violation: "border-l-compliance-violation",
};

const complianceBgColors: Record<string, string> = {
  safe: "",
  warning: "bg-compliance-warning-bg",
  urgent: "bg-compliance-urgent-bg",
  critical: "bg-compliance-critical-bg animate-pulse-alert",
  violation: "bg-compliance-violation-bg animate-pulse-alert",
};

export function EmployeeCard({ employee }: { employee: Employee }) {
  const { updateEmployee, assignLunch, startLunch, endLunch, startBreak, endBreak, markAbsent, employees, settings } = useShift();
  const [info, setInfo] = useState<ComplianceInfo>(() => getComplianceInfo(employee));
  const [editOpen, setEditOpen] = useState(false);
  const [editStart, setEditStart] = useState(employee.actualStart || employee.scheduledStart);
  const [editEnd, setEditEnd] = useState(employee.actualEnd || employee.scheduledEnd);

  useEffect(() => {
    const interval = setInterval(() => {
      setInfo(getComplianceInfo(employee));
    }, 5000);
    setInfo(getComplianceInfo(employee));
    return () => clearInterval(interval);
  }, [employee]);

  // Alert notifications
  useEffect(() => {
    if (employee.lunchStatus !== "not_started" || employee.status !== "active") return;
    const mins = getMinutesToFifthHour(employee);
    if (mins <= 0) {
      toast.error(`⚠️ VIOLATION: ${employee.name} has exceeded 5 hours without lunch!`);
    } else if (mins <= 15) {
      toast.warning(`🔴 CRITICAL: ${employee.name} - ${Math.round(mins)}min to 5th hour!`);
    } else if (mins <= 30) {
      toast.warning(`🟠 URGENT: ${employee.name} - ${Math.round(mins)}min to 5th hour`);
    }
  }, [info.level]);

  const handleSaveEdit = () => {
    updateEmployee(employee.id, { actualStart: editStart, actualEnd: editEnd });
    setEditOpen(false);
  };

  const handleAssignLunch = () => {
    const activeCount = getActiveCashierCount(employees);
    if (activeCount - 1 < settings.minCashiers) {
      toast.warning(`Sending ${employee.name} to lunch will drop coverage below minimum (${settings.minCashiers}).`, {
        action: {
          label: "Send Anyway",
          onClick: () => assignLunch(employee.id),
        },
      });
      return;
    }
    assignLunch(employee.id);
  };

  const handleStartLunch = () => {
    startLunch(employee.id);
    toast.success(`${employee.name} started lunch at ${formatTime(new Date())}`);
  };

  if (employee.status === "absent") {
    return (
      <div className="rounded-lg border border-border bg-card p-4 opacity-50">
        <div className="flex items-center gap-3">
          <UserX className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-foreground">{employee.name}</span>
          <span className="compliance-badge bg-muted text-muted-foreground">Absent</span>
        </div>
      </div>
    );
  }

  const borderColor = complianceBorderColors[info.level] || "";
  const bgColor = complianceBgColors[info.level] || "";

  return (
    <div className={`rounded-lg border-l-4 ${borderColor} border border-border bg-card ${bgColor} transition-colors`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-foreground text-base">{employee.name}</h4>
            <ComplianceBadge info={info} />
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit {employee.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Actual Start</Label>
                    <Input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Actual End</Label>
                    <Input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
                    <Button variant="destructive" onClick={() => { markAbsent(employee.id); setEditOpen(false); }}>
                      Mark Absent
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Shift info row */}
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <InfoChip label="Scheduled" value={`${employee.scheduledStart}–${employee.scheduledEnd}`} />
          <InfoChip label="Actual Start" value={employee.actualStart || "—"} />
          <InfoChip label="Hours Worked" value={formatDuration(info.hoursWorked * 60)} />
          <InfoChip
            label="5th Hour In"
            value={info.minutesToFifthHour === Infinity ? "—" : info.minutesToFifthHour <= 0 ? "PAST" : formatDuration(info.minutesToFifthHour)}
            highlight={info.minutesToFifthHour < 60 && info.minutesToFifthHour > 0}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Lunch actions */}
          {employee.lunchStatus === "not_started" && (
            <Button size="lg" variant="outline" className="gap-2 flex-1 min-w-[140px]" onClick={handleAssignLunch}>
              <UtensilsCrossed className="h-4 w-4" />
              Assign Lunch
            </Button>
          )}
          {(employee.lunchStatus === "not_started" || employee.lunchStatus === "pending") && (
            <Button size="lg" className="gap-2 flex-1 min-w-[140px] bg-compliance-safe text-compliance-safe-foreground hover:bg-compliance-safe/90" onClick={handleStartLunch}>
              <Play className="h-4 w-4" />
              Start Lunch Now
            </Button>
          )}
          {employee.lunchStatus === "pending" && (
            <div className="w-full text-xs text-compliance-warning font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Assigned at {employee.lunchAssignedAt ? formatTime(employee.lunchAssignedAt) : "—"} — waiting to leave
            </div>
          )}
          {employee.lunchStatus === "on_lunch" && (
            <Button size="lg" className="gap-2 flex-1" onClick={() => endLunch(employee.id)}>
              <Square className="h-4 w-4" />
              End Lunch ({employee.lunchStartedAt ? formatTime(employee.lunchStartedAt) : ""})
            </Button>
          )}
          {employee.lunchStatus === "returned" && (
            <span className="compliance-badge bg-compliance-safe-bg text-compliance-safe">
              ✓ Lunch completed
            </span>
          )}

          {/* Break actions */}
          {employee.breakStatus === "not_started" && employee.lunchStatus !== "on_lunch" && (
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => startBreak(employee.id)}>
              <Coffee className="h-3.5 w-3.5" />
              Break
            </Button>
          )}
          {employee.breakStatus === "on_break" && (
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => endBreak(employee.id)}>
              <Square className="h-3.5 w-3.5" />
              End Break
            </Button>
          )}
          {employee.breakStatus === "returned" && (
            <span className="text-xs text-muted-foreground">Break done</span>
          )}
        </div>
      </div>
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
  return (
    <span className={`compliance-badge ${styles[info.level]}`}>
      {info.label}
    </span>
  );
}

function InfoChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md px-2.5 py-1.5 ${highlight ? "bg-compliance-warning-bg" : "bg-muted"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-mono font-medium ${highlight ? "text-compliance-warning" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
