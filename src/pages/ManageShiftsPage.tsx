import { useState } from "react";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, UserX, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ManageShiftsPage() {
  const { employees, addEmployee, updateEmployee, removeEmployee, markAbsent } = useShift();
  const { employeeRecords, roles } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Add shift form state
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("09:00");
  const [scheduledEnd, setScheduledEnd] = useState("17:00");
  const [scheduledLunch, setScheduledLunch] = useState("");
  const [actualStart, setActualStart] = useState("");

  const activeRecords = employeeRecords.filter(r => r.active);

  const handleAddShift = () => {
    const record = activeRecords.find(r => r.id === selectedRecordId);
    if (!record) { toast.error("Select an employee"); return; }

    // Check if already on shift
    if (employees.some(e => e.employeeRecordId === record.id && e.status === "active")) {
      toast.error(`${record.name} is already on an active shift`);
      return;
    }

    addEmployee({
      employeeRecordId: record.id,
      name: record.name,
      primaryRoleId: record.primaryRoleId,
      currentAssignmentId: record.primaryRoleId,
      scheduledStart,
      scheduledEnd,
      scheduledLunch: scheduledLunch || undefined,
      actualStart: actualStart || undefined,
    });
    toast.success(`${record.name} added to shift`);
    setAddOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedRecordId("");
    setScheduledStart("09:00");
    setScheduledEnd("17:00");
    setScheduledLunch("");
    setActualStart("");
  };

  const editingEmployee = editId ? employees.find(e => e.id === editId) : null;

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || roleId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Manage Shifts</h2>
          <p className="text-sm text-muted-foreground">Set up and adjust today's shifts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled>
            <Upload className="h-4 w-4" />
            Import Schedule (OCR)
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Shift</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeRecords.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeRecords.length === 0 && (
                    <p className="text-xs text-muted-foreground">No employees found. Add employees first.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Scheduled Start</Label>
                    <Input type="time" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled End</Label>
                    <Input type="time" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Lunch (optional)</Label>
                  <Input type="time" value={scheduledLunch} onChange={e => setScheduledLunch(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Actual Start (leave blank to use scheduled)</Label>
                  <Input type="time" value={actualStart} onChange={e => setActualStart(e.target.value)} />
                </div>
                <Button onClick={handleAddShift} className="w-full" size="lg">Add to Today's Shift</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Shift table */}
      {employees.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <h3 className="text-lg font-medium text-foreground">No shifts today</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add shifts or import a schedule to get started
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actual Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getRoleName(emp.primaryRoleId)}</TableCell>
                  <TableCell className="text-sm font-mono">{emp.scheduledStart}–{emp.scheduledEnd}</TableCell>
                  <TableCell className="text-sm font-mono">{emp.actualStart || "—"}</TableCell>
                  <TableCell>
                    <span className={`compliance-badge ${
                      emp.status === "active" ? "bg-compliance-safe-bg text-compliance-safe" :
                      emp.status === "absent" ? "bg-muted text-muted-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {emp.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Dialog open={editId === emp.id} onOpenChange={(open) => setEditId(open ? emp.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Edit {emp.name}'s Shift</DialogTitle>
                          </DialogHeader>
                          <EditShiftForm employee={emp} onSave={(updates) => {
                            updateEmployee(emp.id, updates);
                            setEditId(null);
                            toast.success("Shift updated");
                          }} onMarkAbsent={() => {
                            markAbsent(emp.id);
                            setEditId(null);
                          }} />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                        removeEmployee(emp.id);
                        toast.success("Shift removed");
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function EditShiftForm({ employee, onSave, onMarkAbsent }: {
  employee: any;
  onSave: (updates: any) => void;
  onMarkAbsent: () => void;
}) {
  const [start, setStart] = useState(employee.actualStart || employee.scheduledStart);
  const [end, setEnd] = useState(employee.actualEnd || employee.scheduledEnd);
  const [schedStart, setSchedStart] = useState(employee.scheduledStart);
  const [schedEnd, setSchedEnd] = useState(employee.scheduledEnd);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Scheduled Start</Label>
          <Input type="time" value={schedStart} onChange={e => setSchedStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Scheduled End</Label>
          <Input type="time" value={schedEnd} onChange={e => setSchedEnd(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Actual Start</Label>
          <Input type="time" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Actual End</Label>
          <Input type="time" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave({ actualStart: start, actualEnd: end, scheduledStart: schedStart, scheduledEnd: schedEnd })} className="flex-1">Save</Button>
        <Button variant="destructive" onClick={onMarkAbsent}>
          <UserX className="h-4 w-4 mr-1" />
          Absent
        </Button>
      </div>
    </div>
  );
}
