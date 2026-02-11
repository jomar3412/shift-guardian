import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShift } from "@/context/ShiftContext";
import { Plus } from "lucide-react";

export function AddEmployeeDialog() {
  const { addEmployee } = useShift();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scheduledStart, setScheduledStart] = useState("09:00");
  const [scheduledEnd, setScheduledEnd] = useState("17:00");
  const [scheduledLunch, setScheduledLunch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addEmployee({
      name: name.trim(),
      scheduledStart,
      scheduledEnd,
      scheduledLunch: scheduledLunch || undefined,
    });
    setName("");
    setScheduledStart("09:00");
    setScheduledEnd("17:00");
    setScheduledLunch("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee to Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp-name">Employee Name</Label>
            <Input
              id="emp-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John Smith"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input id="start-time" type="time" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input id="end-time" type="time" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lunch-time">Scheduled Lunch (optional)</Label>
            <Input id="lunch-time" type="time" value={scheduledLunch} onChange={e => setScheduledLunch(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" size="lg">Add to Shift</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
