import { useState, useMemo } from "react";
import { Employee } from "@/types/shift";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { getActiveCountByRole } from "@/lib/compliance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface CoverageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  reason: "lunch" | "break";
  onConfirm: (coveredById: string, coverRoleId: string) => void;
}

export function CoverageDialog({ open, onOpenChange, employee, reason, onConfirm }: CoverageDialogProps) {
  const { employees } = useShift();
  const { subRoles, employeeRecords, getQualifiedSubRoles } = useApp();
  const [coveredById, setCoveredById] = useState("");
  const [coverRoleId, setCoverRoleId] = useState(employee.currentAssignmentId);

  // Find active employees who are qualified for the role being covered
  const eligibleCovers = useMemo(() => {
    const targetRoleId = employee.currentAssignmentId;
    return employees.filter(e => {
      if (e.id === employee.id) return false;
      if (e.status !== "active" || e.lunchStatus === "on_lunch" || e.breakStatus === "on_break") return false;
      const record = employeeRecords.find(r => r.id === e.employeeRecordId);
      if (!record) return false;
      const qualified = getQualifiedSubRoles(record);
      return qualified.some(sr => sr.id === targetRoleId);
    });
  }, [employees, employee, employeeRecords, getQualifiedSubRoles]);

  // Check if selecting this cover causes a coverage drop
  const coverWarning = useMemo(() => {
    if (!coveredById) return null;
    const coverEmp = employees.find(e => e.id === coveredById);
    if (!coverEmp) return null;
    const coverCurrentRole = subRoles.find(r => r.id === coverEmp.currentAssignmentId);
    if (coverCurrentRole?.coverageProtection) {
      const count = getActiveCountByRole(employees, coverEmp.currentAssignmentId);
      if (count - 1 < (coverCurrentRole.minCoverage || 0)) {
        return `Moving ${coverEmp.name} will drop ${coverCurrentRole.name} below minimum coverage (${coverCurrentRole.minCoverage}).`;
      }
    }
    return null;
  }, [coveredById, employees, subRoles]);

  const currentRole = subRoles.find(r => r.id === employee.currentAssignmentId);

  const handleConfirm = () => {
    if (!coveredById) return;
    onConfirm(coveredById, coverRoleId);
    onOpenChange(false);
    setCoveredById("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {reason === "lunch" ? "Assign Lunch" : "Log Break"} — {employee.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Coverage Needed For</Label>
            <p className="text-sm font-medium mt-1">{currentRole?.name || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Covered By</Label>
            {eligibleCovers.length === 0 ? (
              <p className="text-sm text-destructive">No eligible employees available for coverage.</p>
            ) : (
              <Select value={coveredById} onValueChange={setCoveredById}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select cover..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCovers.map(e => {
                    const sr = subRoles.find(r => r.id === e.currentAssignmentId);
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} {sr ? `(${sr.name})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cover Assignment</Label>
            <Select value={coverRoleId} onValueChange={setCoverRoleId}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subRoles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {coverWarning && (
            <div className="flex items-start gap-2 rounded-md bg-compliance-warning-bg p-2.5 text-xs text-compliance-warning">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{coverWarning}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!coveredById}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
