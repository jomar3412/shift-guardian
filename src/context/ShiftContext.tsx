import React, { createContext, useContext, useState, useCallback } from "react";
import { Employee, ShiftSettings } from "@/types/shift";
import { generateId } from "@/lib/compliance";

interface ShiftContextType {
  employees: Employee[];
  settings: ShiftSettings;
  addEmployee: (emp: Omit<Employee, "id" | "lunchStatus" | "breakStatus" | "status">) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  assignLunch: (id: string) => void;
  startLunch: (id: string, manualTime?: number) => void;
  endLunch: (id: string) => void;
  startBreak: (id: string) => void;
  endBreak: (id: string) => void;
  markAbsent: (id: string) => void;
  updateSettings: (s: Partial<ShiftSettings>) => void;
}

const ShiftContext = createContext<ShiftContextType | null>(null);

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShift must be used within ShiftProvider");
  return ctx;
}

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<ShiftSettings>({
    minCashiers: 2,
    gracePeriodMinutes: 5,
    overtimeThresholdHours: 8,
  });

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
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  const assignLunch = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, lunchStatus: "pending", lunchAssignedAt: Date.now() } : e
    ));
  }, []);

  const startLunch = useCallback((id: string, manualTime?: number) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, lunchStatus: "on_lunch", lunchStartedAt: manualTime || Date.now() } : e
    ));
  }, []);

  const endLunch = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, lunchStatus: "returned", lunchEndedAt: Date.now() } : e
    ));
  }, []);

  const startBreak = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, breakStatus: "on_break", breakStartedAt: Date.now() } : e
    ));
  }, []);

  const endBreak = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, breakStatus: "returned", breakEndedAt: Date.now() } : e
    ));
  }, []);

  const markAbsent = useCallback((id: string) => {
    setEmployees(prev => prev.map(e =>
      e.id === id ? { ...e, status: "absent" } : e
    ));
  }, []);

  const updateSettings = useCallback((s: Partial<ShiftSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
  }, []);

  return (
    <ShiftContext.Provider value={{
      employees, settings, addEmployee, updateEmployee, removeEmployee,
      assignLunch, startLunch, endLunch, startBreak, endBreak, markAbsent, updateSettings,
    }}>
      {children}
    </ShiftContext.Provider>
  );
}
