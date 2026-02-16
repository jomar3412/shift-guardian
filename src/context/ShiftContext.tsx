import React, { createContext, useContext, useState, useCallback } from "react";
import { Employee, ShiftSettings, UndoAction } from "@/types/shift";
import { generateId } from "@/lib/compliance";

export interface CoverageRecord {
  id: string;
  employeeId: string;
  coveredById: string;
  originalRole: string;
  coverRole: string;
  reason: "lunch" | "break";
  startedAt: number;
  endedAt?: number;
}

interface ShiftContextType {
  employees: Employee[];
  settings: ShiftSettings;
  undoStack: UndoAction[];
  coverageRecords: CoverageRecord[];
  addEmployee: (emp: Omit<Employee, "id" | "lunchStatus" | "breakStatus" | "status">) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  assignLunch: (id: string) => void;
  startLunch: (id: string, manualTime?: number) => void;
  endLunch: (id: string) => void;
  startBreak: (id: string) => void;
  endBreak: (id: string) => void;
  markAbsent: (id: string) => void;
  clockOut: (id: string) => void;
  changeAssignment: (id: string, subRoleId: string) => void;
  updateSettings: (s: Partial<ShiftSettings>) => void;
  pushUndo: (action: Omit<UndoAction, "id" | "timestamp">) => void;
  popUndo: () => void;
  clearUndo: () => void;
  addCoverage: (record: Omit<CoverageRecord, "id" | "startedAt">) => void;
  endCoverage: (employeeId: string) => void;
  getCoverageFor: (employeeId: string) => CoverageRecord | undefined;
  getCoveringBy: (employeeId: string) => CoverageRecord | undefined;
}

const ShiftContext = createContext<ShiftContextType | null>(null);

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShift must be used within ShiftProvider");
  return ctx;
}

const MAX_UNDO = 5;

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<ShiftSettings>({
    minCashiers: 2,
    gracePeriodMinutes: 5,
    overtimeThresholdHours: 8,
  });
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [coverageRecords, setCoverageRecords] = useState<CoverageRecord[]>([]);

  const pushUndo = useCallback((action: Omit<UndoAction, "id" | "timestamp">) => {
    setUndoStack(prev => [{ ...action, id: generateId(), timestamp: Date.now() }, ...prev].slice(0, MAX_UNDO));
  }, []);

  const popUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const [top, ...rest] = prev;
      top.undo();
      return rest;
    });
  }, []);

  const clearUndo = useCallback(() => setUndoStack([]), []);

  const addEmployee = useCallback((emp: Omit<Employee, "id" | "lunchStatus" | "breakStatus" | "status">) => {
    const newEmp: Employee = {
      ...emp,
      id: generateId(),
      lunchStatus: "not_started",
      breakStatus: "not_started",
      status: "active",
      actualStart: emp.actualStart || emp.scheduledStart,
    };
    setEmployees(prev => [...prev, newEmp]);
    pushUndo({
      label: `Added ${emp.name} to shift`,
      undo: () => setEmployees(prev => prev.filter(e => e.id !== newEmp.id)),
    });
  }, [pushUndo]);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees(prev => {
      const emp = prev.find(e => e.id === id);
      if (emp) {
        pushUndo({
          label: `Removed ${emp.name} from shift`,
          undo: () => setEmployees(p => [...p, emp]),
        });
      }
      return prev.filter(e => e.id !== id);
    });
  }, [pushUndo]);

  const assignLunch = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, lunchStatus: "pending", lunchAssignedAt: Date.now() } : e
    ));
    const emp = employees.find(e => e.id === id);
    if (emp) {
      pushUndo({
        label: `Assigned lunch to ${emp.name}`,
        undo: () => setEmployees(p => p.map(e => e.id === id ? { ...e, lunchStatus: "not_started", lunchAssignedAt: undefined } : e)),
      });
    }
  }, [employees, pushUndo]);

  const startLunch = useCallback((id: string, manualTime?: number) => {
    const ts = manualTime || Date.now();
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, lunchStatus: "on_lunch", lunchStartedAt: ts } : e
    ));
    const emp = employees.find(e => e.id === id);
    if (emp) {
      const prevStatus = emp.lunchStatus;
      const prevAssigned = emp.lunchAssignedAt;
      pushUndo({
        label: `Started lunch for ${emp.name}`,
        undo: () => setEmployees(p => p.map(e => e.id === id ? { ...e, lunchStatus: prevStatus, lunchStartedAt: undefined, lunchAssignedAt: prevAssigned } : e)),
      });
    }
  }, [employees, pushUndo]);

  const endLunch = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, lunchStatus: "returned", lunchEndedAt: Date.now() } : e
    ));
    endCoverage(id);
  }, []);

  const startBreak = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, breakStatus: "on_break", breakStartedAt: Date.now() } : e
    ));
    const emp = employees.find(e => e.id === id);
    if (emp) {
      pushUndo({
        label: `Started break for ${emp.name}`,
        undo: () => setEmployees(p => p.map(e => e.id === id ? { ...e, breakStatus: "not_started", breakStartedAt: undefined } : e)),
      });
    }
  }, [employees, pushUndo]);

  const endBreak = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, breakStatus: "returned", breakEndedAt: Date.now() } : e
    ));
    endCoverage(id);
  }, []);

  const markAbsent = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, status: "absent" } : e
    ));
  }, []);

  const clockOut = useCallback((id: string) => {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setEmployees(prev => {
      const emp = prev.find(e => e.id === id);
      if (emp) {
        pushUndo({
          label: `Clocked out ${emp.name}`,
          undo: () => setEmployees(p => p.map(e => e.id === id ? { ...e, status: "active", actualEnd: undefined } : e)),
        });
      }
      return prev.map(e => e.id === id ? { ...e, status: "clocked_out", actualEnd: now } : e);
    });
  }, [pushUndo]);

  const changeAssignment = useCallback((id: string, subRoleId: string) => {
    setEmployees(prev => {
      const emp = prev.find(e => e.id === id);
      if (emp) {
        const oldRole = emp.currentAssignmentId;
        pushUndo({
          label: `Reassigned ${emp.name}`,
          undo: () => setEmployees(p => p.map(e => e.id === id ? { ...e, currentAssignmentId: oldRole } : e)),
        });
      }
      return prev.map(e => e.id === id ? { ...e, currentAssignmentId: subRoleId } : e);
    });
  }, [pushUndo]);

  const updateSettings = useCallback((s: Partial<ShiftSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
  }, []);

  // Coverage management
  const addCoverage = useCallback((record: Omit<CoverageRecord, "id" | "startedAt">) => {
    const newRecord: CoverageRecord = { ...record, id: generateId(), startedAt: Date.now() };
    setCoverageRecords(prev => [...prev, newRecord]);
  }, []);

  const endCoverage = useCallback((employeeId: string) => {
    setCoverageRecords(prev => prev.map(r =>
      r.employeeId === employeeId && !r.endedAt ? { ...r, endedAt: Date.now() } : r
    ));
  }, []);

  const getCoverageFor = useCallback((employeeId: string) => {
    return coverageRecords.find(r => r.employeeId === employeeId && !r.endedAt);
  }, [coverageRecords]);

  const getCoveringBy = useCallback((employeeId: string) => {
    return coverageRecords.find(r => r.coveredById === employeeId && !r.endedAt);
  }, [coverageRecords]);

  return (
    <ShiftContext.Provider value={{
      employees, settings, undoStack, coverageRecords,
      addEmployee, updateEmployee, removeEmployee,
      assignLunch, startLunch, endLunch, startBreak, endBreak, markAbsent,
      clockOut, changeAssignment, updateSettings, pushUndo, popUndo, clearUndo,
      addCoverage, endCoverage, getCoverageFor, getCoveringBy,
    }}>
      {children}
    </ShiftContext.Provider>
  );
}
