import { useState } from "react";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchBar } from "@/components/SearchBar";
import { Plus, Pencil, UserX, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ManageShiftsPage() {
  const { employees, addEmployee, updateEmployee, removeEmployee, markAbsent } = useShift();
  const { employeeRecords, subRoles, getQualifiedSubRoles, getPrimaryRoleById } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("09:00");
  const [scheduledEnd, setScheduledEnd] = useState("17:00");
  const [scheduledLunch, setScheduledLunch] = useState("");
  const [actualStart, setActualStart] = useState("");

  const activeRecords = employeeRecords.filter(r => r.active);
  const selectedRecord = activeRecords.find(r => r.id === selectedRecordId);
  const qualifiedSubs = selectedRecord ? getQualifiedSubRoles(selectedRecord) : [];

  const filtered = search
    ? employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : employees;

  const handleAddShift = () => {
    if (!selectedRecord) { toast.error("Select an employee"); return; }
    if (employees.some(e => e.employeeRecordId === selectedRecord.id && e.status === "active")) {
      toast.error(`${selectedRecord.name} is already on shift`);
      return;
    }
    const assignment = assignmentId || qualifiedSubs[0]?.id || "";
    addEmployee({
      employeeRecordId: selectedRecord.id,
      name: selectedRecord.name,
      primaryRoleId: selectedRecord.primaryRoleId,
      currentAssignmentId: assignment,
      scheduledStart,
      scheduledEnd,
      scheduledLunch: scheduledLunch || undefined,
      actualStart: actualStart || undefined,
    });
    toast.success(`${selectedRecord.name} added to shift`);
    setAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedRecordId("");
    setAssignmentId("");
    setScheduledStart("09:00");
    setScheduledEnd("17:00");
    setScheduledLunch("");
    setActualStart("");
  };

  const getSubRoleName = (id: string) => subRoles.find(r => r.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Manage Shifts</h2>
          <p className="text-xs text-muted-foreground">Set up and adjust today's shifts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" disabled>
            <Upload className="h-3.5 w-3.5" />
            OCR Import
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Shift</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee</Label>
                  <Select value={selectedRecordId} onValueChange={(v) => { setSelectedRecordId(v); setAssignmentId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                    <SelectContent>
                      {activeRecords.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {activeRecords.length === 0 && <p className="text-xs text-muted-foreground">No employees. Add employees first.</p>}
                </div>
                {selectedRecord && qualifiedSubs.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Initial Assignment</Label>
                    <Select value={assignmentId} onValueChange={setAssignmentId}>
                      <SelectTrigger><SelectValue placeholder="Select sub-role..." /></SelectTrigger>
                      <SelectContent>
                        {qualifiedSubs.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Scheduled Start</Label><Input type="time" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Scheduled End</Label><Input type="time" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Scheduled Lunch (optional)</Label><Input type="time" value={scheduledLunch} onChange={e => setScheduledLunch(e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Actual Start (blank = scheduled)</Label><Input type="time" value={actualStart} onChange={e => setActualStart(e.target.value)} /></div>
                <Button onClick={handleAddShift} className="w-full" size="lg">Add to Today's Shift</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search shifts..." />

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <h3 className="text-base font-medium text-foreground">{search ? "No results" : "No shifts today"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{search ? "Try different search" : "Add shifts or import a schedule"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => {
            const primaryName = getPrimaryRoleById(emp.primaryRoleId)?.name || "—";
            return (
              <div key={emp.id} className="rounded-lg border border-border bg-card px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{emp.name}</span>
                      <span className={`compliance-badge text-[10px] ${
                        emp.status === "active" ? "bg-compliance-safe-bg text-compliance-safe" : "bg-muted text-muted-foreground"
                      }`}>{emp.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {primaryName} • {getSubRoleName(emp.currentAssignmentId)} • {emp.scheduledStart}–{emp.scheduledEnd}
                    </div>
                    {emp.actualStart && emp.actualStart !== emp.scheduledStart && (
                      <div className="text-xs text-compliance-warning mt-0.5">Actual: {emp.actualStart}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editId === emp.id} onOpenChange={(open) => setEditId(open ? emp.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader><DialogTitle>Edit {emp.name}'s Shift</DialogTitle></DialogHeader>
                        <EditShiftForm employee={emp} onSave={(updates) => { updateEmployee(emp.id, updates); setEditId(null); toast.success("Updated"); }} onMarkAbsent={() => { markAbsent(emp.id); setEditId(null); }} />
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { removeEmployee(emp.id); toast.success("Removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditShiftForm({ employee, onSave, onMarkAbsent }: { employee: any; onSave: (u: any) => void; onMarkAbsent: () => void }) {
  const [start, setStart] = useState(employee.actualStart || employee.scheduledStart);
  const [end, setEnd] = useState(employee.actualEnd || employee.scheduledEnd);
  const [schedStart, setSchedStart] = useState(employee.scheduledStart);
  const [schedEnd, setSchedEnd] = useState(employee.scheduledEnd);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Sched. Start</Label><Input type="time" value={schedStart} onChange={e => setSchedStart(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Sched. End</Label><Input type="time" value={schedEnd} onChange={e => setSchedEnd(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Actual Start</Label><Input type="time" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Actual End</Label><Input type="time" value={end} onChange={e => setEnd(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave({ actualStart: start, actualEnd: end, scheduledStart: schedStart, scheduledEnd: schedEnd })} className="flex-1">Save</Button>
        <Button variant="destructive" onClick={onMarkAbsent}><UserX className="h-4 w-4 mr-1" />Absent</Button>
      </div>
    </div>
  );
}
