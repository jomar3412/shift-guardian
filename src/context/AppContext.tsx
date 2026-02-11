import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Role, EmployeeRecord, AppSettings } from "@/types/shift";
import { generateId } from "@/lib/compliance";

interface AppContextType {
  roles: Role[];
  addRole: (role: Omit<Role, "id">) => void;
  updateRole: (id: string, updates: Partial<Role>) => void;
  removeRole: (id: string) => void;
  getRoleById: (id: string) => Role | undefined;

  employeeRecords: EmployeeRecord[];
  addEmployeeRecord: (rec: Omit<EmployeeRecord, "id">) => void;
  updateEmployeeRecord: (id: string, updates: Partial<EmployeeRecord>) => void;
  removeEmployeeRecord: (id: string) => void;

  appSettings: AppSettings;
  updateAppSettings: (s: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const DEFAULT_ROLES: Role[] = [
  { id: "cashier", name: "Cashier", type: "standard", minCoverage: 2, coverageProtection: true },
  { id: "self-checkout", name: "Self-Checkout", type: "standard", minCoverage: 1, coverageProtection: true },
  { id: "front-end-manager", name: "Front-End Manager", type: "management", minCoverage: 1, coverageProtection: true },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>(() => loadFromStorage("sg_roles", DEFAULT_ROLES));
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>(() => loadFromStorage("sg_employees", []));
  const [appSettings, setAppSettings] = useState<AppSettings>(() =>
    loadFromStorage("sg_settings", { darkMode: false, timeFormat: "12h" as const })
  );

  // Persist to localStorage
  useEffect(() => { localStorage.setItem("sg_roles", JSON.stringify(roles)); }, [roles]);
  useEffect(() => { localStorage.setItem("sg_employees", JSON.stringify(employeeRecords)); }, [employeeRecords]);
  useEffect(() => { localStorage.setItem("sg_settings", JSON.stringify(appSettings)); }, [appSettings]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", appSettings.darkMode);
  }, [appSettings.darkMode]);

  const addRole = useCallback((role: Omit<Role, "id">) => {
    setRoles(prev => [...prev, { ...role, id: generateId() }]);
  }, []);

  const updateRole = useCallback((id: string, updates: Partial<Role>) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const removeRole = useCallback((id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
  }, []);

  const getRoleById = useCallback((id: string) => {
    return roles.find(r => r.id === id);
  }, [roles]);

  const addEmployeeRecord = useCallback((rec: Omit<EmployeeRecord, "id">) => {
    setEmployeeRecords(prev => [...prev, { ...rec, id: generateId() }]);
  }, []);

  const updateEmployeeRecord = useCallback((id: string, updates: Partial<EmployeeRecord>) => {
    setEmployeeRecords(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const removeEmployeeRecord = useCallback((id: string) => {
    setEmployeeRecords(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateAppSettings = useCallback((s: Partial<AppSettings>) => {
    setAppSettings(prev => ({ ...prev, ...s }));
  }, []);

  return (
    <AppContext.Provider value={{
      roles, addRole, updateRole, removeRole, getRoleById,
      employeeRecords, addEmployeeRecord, updateEmployeeRecord, removeEmployeeRecord,
      appSettings, updateAppSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}
