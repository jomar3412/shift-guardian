import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function EmployeesPage() {
  const { employeeRecords, addEmployeeRecord, updateEmployeeRecord, removeEmployeeRecord, roles } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Employee Database</h2>
          <p className="text-sm text-muted-foreground">{employeeRecords.length} employee{employeeRecords.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              roles={roles}
              onSave={(data) => {
                addEmployeeRecord(data);
                setAddOpen(false);
                toast.success("Employee added");
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {employeeRecords.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <h3 className="text-lg font-medium text-foreground">No employees yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add employees to your database to create shifts</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Primary Role</TableHead>
                <TableHead>Qualified Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeRecords.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{roles.find(r => r.id === emp.primaryRoleId)?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {emp.qualifiedRoleIds.map(rid => (
                        <Badge key={rid} variant="secondary" className="text-xs">
                          {roles.find(r => r.id === rid)?.name || rid}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.active ? "default" : "secondary"}>
                      {emp.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Dialog open={editId === emp.id} onOpenChange={(open) => setEditId(open ? emp.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit {emp.name}</DialogTitle>
                          </DialogHeader>
                          <EmployeeForm
                            roles={roles}
                            initialData={emp}
                            onSave={(data) => {
                              updateEmployeeRecord(emp.id, data);
                              setEditId(null);
                              toast.success("Employee updated");
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => { removeEmployeeRecord(emp.id); toast.success("Employee removed"); }}>
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

function EmployeeForm({ roles, initialData, onSave }: {
  roles: any[];
  initialData?: any;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [primaryRoleId, setPrimaryRoleId] = useState(initialData?.primaryRoleId || "");
  const [qualifiedRoleIds, setQualifiedRoleIds] = useState<string[]>(initialData?.qualifiedRoleIds || []);
  const [active, setActive] = useState(initialData?.active ?? true);
  const [notes, setNotes] = useState(initialData?.notes || "");

  const toggleQualified = (id: string) => {
    setQualifiedRoleIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!primaryRoleId) { toast.error("Select a primary role"); return; }
    const qualified = qualifiedRoleIds.includes(primaryRoleId)
      ? qualifiedRoleIds
      : [...qualifiedRoleIds, primaryRoleId];
    onSave({ name: name.trim(), primaryRoleId, qualifiedRoleIds: qualified, active, notes });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Primary Role</Label>
        <Select value={primaryRoleId} onValueChange={setPrimaryRoleId}>
          <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
          <SelectContent>
            {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Qualified Roles</Label>
        <div className="space-y-2 rounded-md border border-border p-3">
          {roles.map(r => (
            <div key={r.id} className="flex items-center gap-2">
              <Checkbox
                id={`qual-${r.id}`}
                checked={qualifiedRoleIds.includes(r.id)}
                onCheckedChange={() => toggleQualified(r.id)}
              />
              <label htmlFor={`qual-${r.id}`} className="text-sm cursor-pointer">{r.name}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="emp-active" checked={active} onCheckedChange={(v) => setActive(!!v)} />
        <label htmlFor="emp-active" className="text-sm">Active employee</label>
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>
      <Button onClick={handleSubmit} className="w-full" size="lg">
        {initialData ? "Update" : "Add"} Employee
      </Button>
    </div>
  );
}
