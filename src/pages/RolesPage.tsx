import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { RoleType } from "@/types/shift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
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
  const { roles, addRole, updateRole, removeRole } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Role Management</h2>
          <p className="text-sm text-muted-foreground">Configure roles and coverage requirements</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Role</DialogTitle>
            </DialogHeader>
            <RoleForm onSave={(data) => {
              addRole(data);
              setAddOpen(false);
              toast.success("Role added");
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <div key={role.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{role.name}</h3>
              </div>
              <Badge className={roleTypeColors[role.type]}>{roleTypeLabels[role.type]}</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Coverage</span>
                <span className="font-medium">{role.minCoverage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coverage Protection</span>
                <span className="font-medium">{role.coverageProtection ? "On" : "Off"}</span>
              </div>
            </div>
            <div className="flex gap-1 pt-1">
              <Dialog open={editId === role.id} onOpenChange={(open) => setEditId(open ? role.id : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 flex-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Edit {role.name}</DialogTitle>
                  </DialogHeader>
                  <RoleForm initialData={role} onSave={(data) => {
                    updateRole(role.id, data);
                    setEditId(null);
                    toast.success("Role updated");
                  }} />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" className="text-destructive"
                onClick={() => { removeRole(role.id); toast.success("Role removed"); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleForm({ initialData, onSave }: {
  initialData?: any;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<RoleType>(initialData?.type || "standard");
  const [minCoverage, setMinCoverage] = useState(initialData?.minCoverage ?? 1);
  const [coverageProtection, setCoverageProtection] = useState(initialData?.coverageProtection ?? true);

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Role name required"); return; }
    onSave({ name: name.trim(), type, minCoverage, coverageProtection });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Role Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cashier" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Role Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as RoleType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Minimum Coverage</Label>
        <Input type="number" min={0} max={50} value={minCoverage}
          onChange={e => setMinCoverage(parseInt(e.target.value) || 0)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Coverage Protection</Label>
        <Switch checked={coverageProtection} onCheckedChange={setCoverageProtection} />
      </div>
      <Button onClick={handleSubmit} className="w-full" size="lg">
        {initialData ? "Update" : "Add"} Role
      </Button>
    </div>
  );
}
