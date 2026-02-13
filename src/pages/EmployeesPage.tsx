import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SearchBar } from "@/components/SearchBar";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, User } from "lucide-react";
import { toast } from "sonner";
import { EmployeeRecord, QualificationEntry } from "@/types/shift";

export default function EmployeesPage() {
  const { employeeRecords, addEmployeeRecord, updateEmployeeRecord, removeEmployeeRecord, primaryRoles, subRoles } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = search
    ? employeeRecords.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : employeeRecords;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Employees</h2>
          <p className="text-xs text-muted-foreground">{employeeRecords.length} registered</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              primaryRoles={primaryRoles}
              subRoles={subRoles}
              onSave={(data) => {
                addEmployeeRecord(data);
                setAddOpen(false);
                toast.success("Employee added");
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search employees..." />

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-base font-medium text-foreground">{search ? "No results" : "No employees yet"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Try a different search" : "Add employees to your database"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => {
            const isExpanded = expandedId === emp.id;
            const primary = primaryRoles.find(r => r.id === emp.primaryRoleId);
            const qualTags = (emp.qualifications || [])
              .map(q => subRoles.find(sr => sr.id === q.subRoleId)?.name)
              .filter(Boolean);

            return (
              <div key={emp.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div
                  className="px-3 py-3 flex items-center gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{emp.name}</span>
                      <Badge variant={emp.active ? "default" : "secondary"} className="text-[10px] h-5">
                        {emp.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {primary?.name || "—"}
                    </div>
                    {/* Qualification tags */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {qualTags.slice(0, 4).map(tag => (
                        <span key={tag} className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                      {qualTags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{qualTags.length - 4}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qualified Roles</div>
                      {(emp.qualifications || []).map(q => {
                        const sr = subRoles.find(s => s.id === q.subRoleId);
                        return (
                          <div key={q.subRoleId} className="flex items-center justify-between text-sm bg-muted rounded-md px-2 py-1.5">
                            <span>{sr?.name || q.subRoleId}</span>
                            {q.notes && <span className="text-xs text-muted-foreground italic truncate max-w-[140px]">{q.notes}</span>}
                          </div>
                        );
                      })}
                      {(emp.qualifications || []).length === 0 && (
                        <p className="text-xs text-muted-foreground">No qualifications set</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Register Access: {emp.hasRegisterAccess ? "✓ Yes" : "✗ No"}</span>
                    </div>
                    {emp.notes && (
                      <p className="text-xs text-muted-foreground italic">{emp.notes}</p>
                    )}
                    <div className="flex gap-2">
                      <Dialog open={editId === emp.id} onOpenChange={(open) => setEditId(open ? emp.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1 flex-1">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit {emp.name}</DialogTitle>
                          </DialogHeader>
                          <EmployeeForm
                            primaryRoles={primaryRoles}
                            subRoles={subRoles}
                            initialData={emp}
                            onSave={(data) => {
                              updateEmployeeRecord(emp.id, data);
                              setEditId(null);
                              toast.success("Employee updated");
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" className="text-destructive gap-1"
                        onClick={() => { removeEmployeeRecord(emp.id); toast.success("Employee removed"); }}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeForm({ primaryRoles, subRoles, initialData, onSave }: {
  primaryRoles: any[];
  subRoles: any[];
  initialData?: EmployeeRecord;
  onSave: (data: Omit<EmployeeRecord, "id">) => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [primaryRoleId, setPrimaryRoleId] = useState(initialData?.primaryRoleId || "");
  const [qualifications, setQualifications] = useState<QualificationEntry[]>(initialData?.qualifications || []);
  const [hasRegisterAccess, setHasRegisterAccess] = useState(initialData?.hasRegisterAccess ?? true);
  const [active, setActive] = useState(initialData?.active ?? true);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [qualNotes, setQualNotes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    (initialData?.qualifications || []).forEach(q => { if (q.notes) m[q.subRoleId] = q.notes; });
    return m;
  });

  const toggleQualification = (subRoleId: string) => {
    setQualifications(prev =>
      prev.some(q => q.subRoleId === subRoleId)
        ? prev.filter(q => q.subRoleId !== subRoleId)
        : [...prev, { subRoleId, notes: qualNotes[subRoleId] || undefined }]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!primaryRoleId) { toast.error("Select a primary role"); return; }

    // Filter out register-based qualifications if no register access
    const finalQuals = qualifications.map(q => ({
      subRoleId: q.subRoleId,
      notes: qualNotes[q.subRoleId] || undefined,
    })).filter(q => {
      const sr = subRoles.find((s: any) => s.id === q.subRoleId);
      if (sr?.requiresRegisterAccess && !hasRegisterAccess) return false;
      return true;
    });

    onSave({ name: name.trim(), primaryRoleId, qualifications: finalQuals, hasRegisterAccess, active, notes });
  };

  // Available sub-roles filtered by register access
  const availableSubRoles = subRoles.filter((sr: any) => !sr.requiresRegisterAccess || hasRegisterAccess);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Primary Role (Job Title)</Label>
        <Select value={primaryRoleId} onValueChange={setPrimaryRoleId}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {primaryRoles.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label>Register Access</Label>
        <Switch checked={hasRegisterAccess} onCheckedChange={setHasRegisterAccess} />
      </div>
      {!hasRegisterAccess && (
        <p className="text-xs text-muted-foreground">Register-based sub-roles (Cashier, SCO, etc.) will be unavailable</p>
      )}
      <div className="space-y-2">
        <Label>Qualified Sub-Roles</Label>
        <div className="space-y-1.5 rounded-md border border-border p-3 max-h-[200px] overflow-y-auto">
          {availableSubRoles.map((sr: any) => {
            const isChecked = qualifications.some(q => q.subRoleId === sr.id);
            return (
              <div key={sr.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`qual-${sr.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleQualification(sr.id)}
                  />
                  <label htmlFor={`qual-${sr.id}`} className="text-sm cursor-pointer flex-1">{sr.name}</label>
                  {sr.requiresRegisterAccess && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">REG</span>
                  )}
                </div>
                {isChecked && (
                  <Input
                    value={qualNotes[sr.id] || ""}
                    onChange={e => setQualNotes(prev => ({ ...prev, [sr.id]: e.target.value }))}
                    placeholder="Notes (e.g. 'Does not prefer')"
                    className="h-7 text-xs ml-6"
                  />
                )}
              </div>
            );
          })}
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
