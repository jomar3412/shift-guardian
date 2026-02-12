import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { RoleType, PrimaryRole, SubRole } from "@/types/shift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Shield, Briefcase } from "lucide-react";
import { toast } from "sonner";

const roleTypeLabels: Record<RoleType, string> = {
  standard: "Standard",
  management: "Management",
  support: "Support",
};

const roleTypeColors: Record<RoleType, string> = {
  standard: "bg-primary/10 text-primary",
  management: "bg-compliance-urgent-bg text-compliance-urgent",
  support: "bg-compliance-safe-bg text-compliance-safe",
};

export default function RolesPage() {
  const {
    primaryRoles, addPrimaryRole, updatePrimaryRole, removePrimaryRole,
    subRoles, addSubRole, updateSubRole, removeSubRole,
  } = useApp();
  const [addPrimaryOpen, setAddPrimaryOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Role Management</h2>
        <p className="text-sm text-muted-foreground">Configure job titles and assignment positions</p>
      </div>

      <Tabs defaultValue="sub-roles">
        <TabsList>
          <TabsTrigger value="sub-roles" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Sub-Roles (Assignments)
          </TabsTrigger>
          <TabsTrigger value="primary" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Primary Roles (Job Titles)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sub-roles" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  Add Sub-Role
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Add Sub-Role</DialogTitle></DialogHeader>
                <SubRoleForm onSave={(data) => { addSubRole(data); setAddSubOpen(false); toast.success("Sub-role added"); }} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {subRoles.map(role => (
              <div key={role.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{role.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {role.requiresRegisterAccess && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">REG</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Coverage</span>
                    <span className="font-medium">{role.minCoverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coverage Protection</span>
                    <span className="font-medium">{role.coverageProtection ? "On" : "Off"}</span>
                  </div>
                </div>
                {role.notes && <p className="text-xs text-muted-foreground italic">{role.notes}</p>}
                <div className="flex gap-1 pt-1">
                  <Dialog open={editId === role.id} onOpenChange={(open) => setEditId(open ? role.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 flex-1 text-xs"><Pencil className="h-3 w-3" /> Edit</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Edit {role.name}</DialogTitle></DialogHeader>
                      <SubRoleForm initialData={role} onSave={(data) => { updateSubRole(role.id, data); setEditId(null); toast.success("Updated"); }} />
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { removeSubRole(role.id); toast.success("Removed"); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="primary" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={addPrimaryOpen} onOpenChange={setAddPrimaryOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  Add Job Title
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Add Job Title</DialogTitle></DialogHeader>
                <PrimaryRoleForm onSave={(data) => { addPrimaryRole(data); setAddPrimaryOpen(false); toast.success("Job title added"); }} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {primaryRoles.map(role => (
              <div key={role.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-sm">{role.name}</h3>
                  <Badge className={roleTypeColors[role.type]}>{roleTypeLabels[role.type]}</Badge>
                </div>
                <div className="flex gap-1">
                  <Dialog open={editId === role.id} onOpenChange={(open) => setEditId(open ? role.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 flex-1 text-xs"><Pencil className="h-3 w-3" /> Edit</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader><DialogTitle>Edit {role.name}</DialogTitle></DialogHeader>
                      <PrimaryRoleForm initialData={role} onSave={(data) => { updatePrimaryRole(role.id, data); setEditId(null); toast.success("Updated"); }} />
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { removePrimaryRole(role.id); toast.success("Removed"); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubRoleForm({ initialData, onSave }: { initialData?: SubRole; onSave: (data: Omit<SubRole, "id">) => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [requiresRegisterAccess, setRequiresRegisterAccess] = useState(initialData?.requiresRegisterAccess ?? false);
  const [minCoverage, setMinCoverage] = useState(initialData?.minCoverage ?? 1);
  const [coverageProtection, setCoverageProtection] = useState(initialData?.coverageProtection ?? true);
  const [notes, setNotes] = useState(initialData?.notes || "");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Self-Checkout" autoFocus />
      </div>
      <div className="flex items-center justify-between">
        <Label>Requires Register Access</Label>
        <Switch checked={requiresRegisterAccess} onCheckedChange={setRequiresRegisterAccess} />
      </div>
      <div className="space-y-2">
        <Label>Minimum Coverage</Label>
        <Input type="number" min={0} max={50} value={minCoverage} onChange={e => setMinCoverage(parseInt(e.target.value) || 0)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Coverage Protection</Label>
        <Switch checked={coverageProtection} onCheckedChange={setCoverageProtection} />
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
      </div>
      <Button onClick={() => {
        if (!name.trim()) { toast.error("Name required"); return; }
        onSave({ name: name.trim(), requiresRegisterAccess, minCoverage, coverageProtection, notes: notes || undefined });
      }} className="w-full" size="lg">
        {initialData ? "Update" : "Add"} Sub-Role
      </Button>
    </div>
  );
}

function PrimaryRoleForm({ initialData, onSave }: { initialData?: PrimaryRole; onSave: (data: Omit<PrimaryRole, "id">) => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<RoleType>(initialData?.type || "standard");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Job Title</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front-End Associate" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as RoleType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => {
        if (!name.trim()) { toast.error("Name required"); return; }
        onSave({ name: name.trim(), type });
      }} className="w-full" size="lg">
        {initialData ? "Update" : "Add"} Job Title
      </Button>
    </div>
  );
}
