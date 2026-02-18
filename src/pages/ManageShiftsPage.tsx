import { useMemo, useState } from "react";
import { Employee, EmployeeRecord } from "@/types/shift";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchBar } from "@/components/SearchBar";
import { parseScheduleText, ParsedShiftRow } from "@/lib/scheduleImport";
import { checkCoverageForLunch } from "@/lib/compliance";
import { Plus, Pencil, UserX, Trash2, Upload, Sparkles, List } from "lucide-react";
import { toast } from "sonner";

const IMPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shift-import`;

interface ImportPreviewRow extends ParsedShiftRow {
  record: EmployeeRecord | null;
  duplicateActive: boolean;
  suggestedAssignmentId: string;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function pickEmployeeRecordByName(name: string, candidates: EmployeeRecord[]): EmployeeRecord | null {
  const target = normalizeName(name);
  if (!target) return null;

  const exact = candidates.find((r) => normalizeName(r.name) === target);
  if (exact) return exact;

  const partial = candidates.find((r) => normalizeName(r.name).includes(target) || target.includes(normalizeName(r.name)));
  if (partial) return partial;

  const targetTokens = target.split(" ").filter(Boolean);
  let best: EmployeeRecord | null = null;
  let bestScore = 0;
  for (const record of candidates) {
    const tokens = normalizeName(record.name).split(" ").filter(Boolean);
    const score = targetTokens.filter((t) => tokens.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  }
  return bestScore > 0 ? best : null;
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function recognizeImageText(file: File): Promise<string> {
  const mod = await import("tesseract.js");
  const result = await mod.recognize(file, "eng");
  return result.data?.text || "";
}

export default function ManageShiftsPage() {
  const { employees, addEmployee, updateEmployee, removeEmployee, markAbsent } = useShift();
  const { employeeRecords, subRoles, getQualifiedSubRoles, getPrimaryRoleById } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ParsedShiftRow[]>([]);
  const [importNotes, setImportNotes] = useState("");
  const [defaultImportStart, setDefaultImportStart] = useState("09:00");
  const [defaultImportEnd, setDefaultImportEnd] = useState("17:00");
  const [coverageEmpId, setCoverageEmpId] = useState("");
  const [coverageAnswer, setCoverageAnswer] = useState("");

  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [assignmentId, setAssignmentId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("09:00");
  const [scheduledEnd, setScheduledEnd] = useState("17:00");
  const [scheduledLunch, setScheduledLunch] = useState("");
  const [actualStart, setActualStart] = useState("");

  const activeRecords = employeeRecords.filter((r) => r.active);
  const selectedRecord = activeRecords.find((r) => r.id === selectedRecordId);
  const filteredActiveRecords = employeeQuery.trim()
    ? activeRecords.filter((r) => r.name.toLowerCase().includes(employeeQuery.toLowerCase()))
    : activeRecords;
  const qualifiedSubs = selectedRecord ? getQualifiedSubRoles(selectedRecord) : [];

  const filtered = search
    ? employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : employees;

  const importPreviewRows = useMemo<ImportPreviewRow[]>(() => {
    return importRows.map((row) => {
      const record = pickEmployeeRecordByName(row.name, activeRecords);
      const duplicateActive = !!record && employees.some((e) => e.employeeRecordId === record.id && e.status === "active");
      const suggestedAssignmentId = record ? getQualifiedSubRoles(record)[0]?.id || "" : "";
      return { ...row, record, duplicateActive, suggestedAssignmentId };
    });
  }, [importRows, activeRecords, employees, getQualifiedSubRoles]);

  const handleAddShift = () => {
    if (!selectedRecord) { toast.error("Select an employee"); return; }
    if (employees.some((e) => e.employeeRecordId === selectedRecord.id && e.status === "active")) {
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
    setEmployeeQuery("");
    setShowAllEmployees(false);
    setAssignmentId("");
    setScheduledStart("09:00");
    setScheduledEnd("17:00");
    setScheduledLunch("");
    setActualStart("");
  };

  const getSubRoleName = (id: string) => subRoles.find((r) => r.id === id)?.name || id;

  const askCoverage = () => {
    const employee = employees.find((e) => e.id === coverageEmpId);
    if (!employee) {
      toast.error("Pick an employee first.");
      return;
    }
    const targetRole = subRoles.find((r) => r.id === employee.currentAssignmentId);
    const baseCheck = checkCoverageForLunch(employees, employee.id, subRoles);
    const eligibleCovers = employees.filter((candidate) => {
      if (candidate.id === employee.id) return false;
      if (candidate.status !== "active" || candidate.lunchStatus === "on_lunch" || candidate.breakStatus === "on_break") return false;
      const record = employeeRecords.find((r) => r.id === candidate.employeeRecordId);
      if (!record) return false;
      return getQualifiedSubRoles(record).some((role) => role.id === employee.currentAssignmentId);
    });

    const title = baseCheck.safe ? "Yes, coverage is likely safe." : "Coverage risk found.";
    const warningText = baseCheck.warnings.length > 0 ? baseCheck.warnings.join(" ") : "";
    const coverText = eligibleCovers.length > 0
      ? `Possible coverage: ${eligibleCovers.slice(0, 4).map((c) => c.name).join(", ")}.`
      : "No currently eligible cover employees found.";

    setCoverageAnswer(
      `${title}\n${targetRole ? `Role: ${targetRole.name}.` : ""}\n${warningText}\n${coverText}\nTip: ask follow-up details in the Shift Assistant bubble for deeper scenarios.`
        .trim()
    );
  };

  const analyzeImport = async () => {
    if (!importText.trim() && !importFile) {
      toast.error("Upload an image or paste schedule text.");
      return;
    }

    setImporting(true);
    setImportNotes("");

    try {
      let rows: ParsedShiftRow[] = [];
      if (importText.trim()) {
        rows = parseScheduleText(importText);
      }

      if (importFile) {
        const imageDataUrl = await fileToDataUrl(importFile);
        let backendFailed = false;
        const resp = await fetch(IMPORT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageDataUrl, rawText: importText.trim() || undefined }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const aiRows = Array.isArray(data.rows)
            ? data.rows
              .map((row) => ({
                name: typeof row?.name === "string" ? row.name.trim() : "",
                start: typeof row?.start === "string" ? row.start : undefined,
                end: typeof row?.end === "string" ? row.end : undefined,
                lunch: typeof row?.lunch === "string" ? row.lunch : undefined,
              }))
              .filter((row) => row.name.length > 0)
            : [];
          rows = aiRows.length > 0 ? aiRows : rows;
          setImportNotes(data.notes || "");
        } else if (!rows.length) {
          backendFailed = true;
          const err = await resp.json().catch(() => ({ error: "Import failed" }));
          setImportNotes([err.error, err.details].filter(Boolean).join(" — "));
        }

        if ((!rows.length || backendFailed) && importFile) {
          try {
            const ocrText = await recognizeImageText(importFile);
            const fallbackRows = parseScheduleText(ocrText);
            if (fallbackRows.length > 0) {
              rows = fallbackRows;
              setImportNotes("Used on-device OCR fallback.");
            }
          } catch {
            // Keep existing notes and fall through to no-rows handling.
          }
        }
      }

      if (!rows.length) {
        toast.error("Could not find schedule rows. Try a clearer image or paste text.");
        setImportRows([]);
        return;
      }

      setImportRows(rows);
      toast.success(`Parsed ${rows.length} schedule row${rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const applyImportedRows = () => {
    let added = 0;
    let skipped = 0;

    for (const row of importPreviewRows) {
      if (!row.record || row.duplicateActive) {
        skipped += 1;
        continue;
      }
      addEmployee({
        employeeRecordId: row.record.id,
        name: row.record.name,
        primaryRoleId: row.record.primaryRoleId,
        currentAssignmentId: row.suggestedAssignmentId,
        scheduledStart: row.start || defaultImportStart,
        scheduledEnd: row.end || defaultImportEnd,
        scheduledLunch: row.lunch || undefined,
        actualStart: row.start || defaultImportStart,
      });
      added += 1;
    }

    toast.success(`Imported ${added} shift${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`);
    if (added > 0) {
      setImportRows([]);
      setImportNotes("");
      setImportFile(null);
      setImportText("");
      setImportOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Coverage Quick Question
          </h3>
          <Button size="sm" variant="outline" onClick={askCoverage}>Ask</Button>
        </div>
        <div className="flex gap-2">
          <Select value={coverageEmpId} onValueChange={setCoverageEmpId}>
            <SelectTrigger>
              <SelectValue placeholder="If I send who to lunch?" />
            </SelectTrigger>
            <SelectContent>
              {employees
                .filter((e) => e.status === "active")
                .map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {coverageAnswer && (
          <div className="text-xs text-muted-foreground whitespace-pre-line rounded-md bg-muted p-2.5">
            {coverageAnswer}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Manage Shifts</h2>
          <p className="text-xs text-muted-foreground">Set up and adjust today's shifts</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex">
                <Upload className="h-3.5 w-3.5" />
                OCR Import
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden h-9 w-9">
                <Upload className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Schedule from Screenshot</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Upload schedule image (optional if pasting text)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Paste schedule text (optional)</Label>
                  <textarea
                    className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Example: Jane Smith 9:00am-5:30pm"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    If image OCR fails, use your phone's copy-text feature and paste the schedule here.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={analyzeImport} disabled={importing}>
                    {importing ? "Analyzing..." : "Analyze Schedule"}
                  </Button>
                  {importRows.length > 0 && (
                    <Button variant="secondary" onClick={applyImportedRows}>
                      Apply Imported Shifts
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Default Start (if missing)</Label>
                    <Input type="time" value={defaultImportStart} onChange={(e) => setDefaultImportStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default End (if missing)</Label>
                    <Input type="time" value={defaultImportEnd} onChange={(e) => setDefaultImportEnd(e.target.value)} />
                  </div>
                </div>
                {importNotes && <p className="text-xs text-muted-foreground">{importNotes}</p>}
                {importPreviewRows.length > 0 && (
                  <>
                    <div className="max-h-64 overflow-auto rounded-md border border-border hidden sm:block">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-2 py-1 text-left">Detected</th>
                            <th className="px-2 py-1 text-left">Matched Employee</th>
                            <th className="px-2 py-1 text-left">Shift</th>
                            <th className="px-2 py-1 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreviewRows.map((row, idx) => (
                            <tr key={`${row.name}-${row.start}-${idx}`} className="border-t border-border">
                              <td className="px-2 py-1">{row.name}</td>
                              <td className="px-2 py-1">{row.record?.name || "No match"}</td>
                              <td className="px-2 py-1">
                                {(row.start || defaultImportStart)} - {(row.end || defaultImportEnd)}
                                {(!row.start || !row.end) && <span className="ml-1 text-muted-foreground">(default)</span>}
                              </td>
                              <td className="px-2 py-1">
                                {!row.record ? "Skip (unmatched)" : row.duplicateActive ? "Skip (already active)" : "Ready"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="sm:hidden space-y-2 max-h-64 overflow-auto">
                      {importPreviewRows.map((row, idx) => (
                        <div key={`${row.name}-${row.start}-${idx}`} className="rounded-md border border-border p-2 text-xs">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-muted-foreground">
                            {(row.start || defaultImportStart)} - {(row.end || defaultImportEnd)}
                            {(!row.start || !row.end) ? " (default)" : ""}
                          </div>
                          <div className="text-muted-foreground">{row.record?.name || "No match"}</div>
                          <div className="mt-1">
                            {!row.record ? "Skip (unmatched)" : row.duplicateActive ? "Skip (already active)" : "Ready"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
                <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-2.5">
                  <Label className="text-xs">Employee</Label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <Input
                        value={employeeQuery}
                        onChange={(e) => {
                          setEmployeeQuery(e.target.value);
                          setShowAllEmployees(false);
                        }}
                        placeholder="Type employee name..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowAllEmployees((prev) => !prev)}
                        aria-label="Browse all employees"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    {employeeQuery.trim().length > 0 && !showAllEmployees && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                        {filteredActiveRecords.length > 0 ? (
                          filteredActiveRecords.slice(0, 20).map((r) => (
                            <button
                              type="button"
                              key={r.id}
                              onClick={() => {
                                setSelectedRecordId(r.id);
                                setEmployeeQuery(r.name);
                                setShowAllEmployees(false);
                                setAssignmentId("");
                              }}
                              className={`w-full px-2.5 py-2 text-left text-sm hover:bg-muted ${
                                selectedRecordId === r.id ? "bg-muted font-medium" : ""
                              }`}
                            >
                              {r.name}
                            </button>
                          ))
                        ) : (
                          <p className="px-2.5 py-2 text-xs text-muted-foreground">No matches.</p>
                        )}
                      </div>
                    )}
                    {showAllEmployees && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                        {activeRecords.map((r) => (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => {
                              setSelectedRecordId(r.id);
                              setEmployeeQuery(r.name);
                              setShowAllEmployees(false);
                              setAssignmentId("");
                            }}
                            className={`w-full px-2.5 py-2 text-left text-sm hover:bg-muted ${
                              selectedRecordId === r.id ? "bg-muted font-medium" : ""
                            }`}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeRecords.length === 0 && <p className="text-xs text-muted-foreground">No employees. Add employees first.</p>}
                </div>
                {selectedRecord && qualifiedSubs.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Initial Assignment</Label>
                    <Select value={assignmentId} onValueChange={setAssignmentId}>
                      <SelectTrigger><SelectValue placeholder="Select sub-role..." /></SelectTrigger>
                      <SelectContent>
                        {qualifiedSubs.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Scheduled Start</Label><Input type="time" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Scheduled End</Label><Input type="time" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Scheduled Lunch (optional)</Label><Input type="time" value={scheduledLunch} onChange={(e) => setScheduledLunch(e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Actual Start (blank = scheduled)</Label><Input type="time" value={actualStart} onChange={(e) => setActualStart(e.target.value)} /></div>
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
          {filtered.map((emp) => {
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
                        <EditShiftForm
                          employee={emp}
                          roleOptions={(() => {
                            const rec = employeeRecords.find((r) => r.id === emp.employeeRecordId);
                            return rec ? getQualifiedSubRoles(rec) : [];
                          })()}
                          onSave={(updates) => { updateEmployee(emp.id, updates); setEditId(null); toast.success("Updated"); }}
                          onMarkAbsent={() => { markAbsent(emp.id); setEditId(null); }}
                        />
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

function EditShiftForm({
  employee,
  roleOptions,
  onSave,
  onMarkAbsent,
}: {
  employee: Employee;
  roleOptions: Array<{ id: string; name: string }>;
  onSave: (u: Partial<Employee>) => void;
  onMarkAbsent: () => void;
}) {
  const [start, setStart] = useState(employee.actualStart || employee.scheduledStart);
  const [end, setEnd] = useState(employee.actualEnd || employee.scheduledEnd);
  const [schedStart, setSchedStart] = useState(employee.scheduledStart);
  const [schedEnd, setSchedEnd] = useState(employee.scheduledEnd);
  const [schedLunch, setSchedLunch] = useState(employee.scheduledLunch || "");
  const [assignmentId, setAssignmentId] = useState(employee.currentAssignmentId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Sched. Start</Label><Input type="time" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Sched. End</Label><Input type="time" value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Actual Start</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Actual End</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      {roleOptions.length > 1 && (
        <div className="space-y-1">
          <Label className="text-xs">Assignment</Label>
          <Select value={assignmentId} onValueChange={setAssignmentId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Scheduled Lunch (manual override)</Label>
        <Input type="time" value={schedLunch} onChange={(e) => setSchedLunch(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onSave({
            actualStart: start,
            actualEnd: end,
            scheduledStart: schedStart,
            scheduledEnd: schedEnd,
            currentAssignmentId: assignmentId,
            scheduledLunch: schedLunch || undefined,
          })}
          className="flex-1"
        >
          Save
        </Button>
        <Button variant="destructive" onClick={onMarkAbsent}><UserX className="h-4 w-4 mr-1" />Absent</Button>
      </div>
    </div>
  );
}
