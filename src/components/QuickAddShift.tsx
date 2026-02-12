import { useState } from "react";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function QuickAddShift() {
  const { addEmployee, employees } = useShift();
  const { employeeRecords, getQualifiedSubRoles, subRoles } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [scheduledLunch, setScheduledLunch] = useState("");

  const activeRecords = employeeRecords.filter(r => r.active);
  const selectedRecord = activeRecords.find(r => r.id === selectedRecordId);
  const qualifiedSubs = selectedRecord ? getQualifiedSubRoles(selectedRecord) : [];

  // Set default start time to now
  const setNowStart = () => {
    const now = new Date();
    setScheduledStart(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  };

  const handleAdd = () => {
    if (!selectedRecord) { toast.error("Select an employee"); return; }
    if (employees.some(e => e.employeeRecordId === selectedRecord.id && e.status === "active")) {
      toast.error(`${selectedRecord.name} is already on shift`);
      return;
    }
    const start = scheduledStart || `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    const end = scheduledEnd || "17:00";
    const assignment = assignmentId || qualifiedSubs[0]?.id || "";

    addEmployee({
      employeeRecordId: selectedRecord.id,
      name: selectedRecord.name,
      primaryRoleId: selectedRecord.primaryRoleId,
      currentAssignmentId: assignment,
      scheduledStart: start,
      scheduledEnd: end,
      scheduledLunch: scheduledLunch || undefined,
      actualStart: start,
    });
    toast.success(`${selectedRecord.name} added`);
    setOpen(false);
    setSelectedRecordId("");
    setAssignmentId("");
    setScheduledStart("");
    setScheduledEnd("");
    setScheduledLunch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-10 w-10 rounded-full shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick Add to Shift</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Employee</Label>
            <Select value={selectedRecordId} onValueChange={(v) => { setSelectedRecordId(v); setAssignmentId(""); }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {activeRecords.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRecord && qualifiedSubs.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Assignment</Label>
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {qualifiedSubs.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Start</Label>
              <Input type="time" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End</Label>
              <Input type="time" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} className="h-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Planned Lunch (optional)</Label>
            <Input type="time" value={scheduledLunch} onChange={e => setScheduledLunch(e.target.value)} className="h-10" />
          </div>
          <Button onClick={handleAdd} className="w-full h-11" size="lg">Add to Shift</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
