import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { PrimaryRole, SubRole, EmployeeRecord, AppSettings } from "@/types/shift";
import { generateId } from "@/lib/compliance";

interface AppContextType {
  primaryRoles: PrimaryRole[];
  addPrimaryRole: (role: Omit<PrimaryRole, "id">) => void;
  updatePrimaryRole: (id: string, updates: Partial<PrimaryRole>) => void;
  removePrimaryRole: (id: string) => void;

  subRoles: SubRole[];
  addSubRole: (role: Omit<SubRole, "id">) => void;
  updateSubRole: (id: string, updates: Partial<SubRole>) => void;
  removeSubRole: (id: string) => void;

  employeeRecords: EmployeeRecord[];
  addEmployeeRecord: (rec: Omit<EmployeeRecord, "id">) => void;
  updateEmployeeRecord: (id: string, updates: Partial<EmployeeRecord>) => void;
  removeEmployeeRecord: (id: string) => void;

  appSettings: AppSettings;
  updateAppSettings: (s: Partial<AppSettings>) => void;

  getSubRoleById: (id: string) => SubRole | undefined;
  getPrimaryRoleById: (id: string) => PrimaryRole | undefined;
  getQualifiedSubRoles: (record: EmployeeRecord) => SubRole[];
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

const DEFAULT_PRIMARY_ROLES: PrimaryRole[] = [
  { id: "fe-associate", name: "Front-End Teaming Associate", type: "standard" },
  { id: "team-lead", name: "Team Lead", type: "management" },
  { id: "cart-associate", name: "Cart Associate", type: "support" },
];

const DEFAULT_SUB_ROLES: SubRole[] = [
  { id: "cashier", name: "Cashier", requiresRegisterAccess: true, minCoverage: 2, coverageProtection: true },
  { id: "self-checkout", name: "Self-Checkout", requiresRegisterAccess: true, minCoverage: 1, coverageProtection: true },
  { id: "service-desk", name: "Service Desk", requiresRegisterAccess: true, minCoverage: 1, coverageProtection: true },
  { id: "grocery-door", name: "Grocery Door", requiresRegisterAccess: false, minCoverage: 0, coverageProtection: false },
  { id: "pharmacy-door", name: "Pharmacy Door", requiresRegisterAccess: false, minCoverage: 0, coverageProtection: false },
  { id: "cart-pusher", name: "Cart Pusher", requiresRegisterAccess: false, minCoverage: 0, coverageProtection: false },
  { id: "floor-coverage", name: "Floor Coverage", requiresRegisterAccess: false, minCoverage: 1, coverageProtection: true },
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
  const [primaryRoles, setPrimaryRoles] = useState<PrimaryRole[]>(() => loadFromStorage("sg_primary_roles", DEFAULT_PRIMARY_ROLES));
  const [subRoles, setSubRoles] = useState<SubRole[]>(() => loadFromStorage("sg_sub_roles", DEFAULT_SUB_ROLES));
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>(() => loadFromStorage("sg_employees", []));
  const [appSettings, setAppSettings] = useState<AppSettings>(() =>
    loadFromStorage("sg_settings", { darkMode: false, timeFormat: "12h" as const })
  );

  useEffect(() => { localStorage.setItem("sg_primary_roles", JSON.stringify(primaryRoles)); }, [primaryRoles]);
  useEffect(() => { localStorage.setItem("sg_sub_roles", JSON.stringify(subRoles)); }, [subRoles]);
  useEffect(() => { localStorage.setItem("sg_employees", JSON.stringify(employeeRecords)); }, [employeeRecords]);
  useEffect(() => { localStorage.setItem("sg_settings", JSON.stringify(appSettings)); }, [appSettings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", appSettings.darkMode);
  }, [appSettings.darkMode]);

  const addPrimaryRole = useCallback((role: Omit<PrimaryRole, "id">) => {
    setPrimaryRoles(prev => [...prev, { ...role, id: generateId() }]);
  }, []);
  const updatePrimaryRole = useCallback((id: string, updates: Partial<PrimaryRole>) => {
    setPrimaryRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);
  const removePrimaryRole = useCallback((id: string) => {
    setPrimaryRoles(prev => prev.filter(r => r.id !== id));
  }, []);

  const addSubRole = useCallback((role: Omit<SubRole, "id">) => {
    setSubRoles(prev => [...prev, { ...role, id: generateId() }]);
  }, []);
  const updateSubRole = useCallback((id: string, updates: Partial<SubRole>) => {
    setSubRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);
  const removeSubRole = useCallback((id: string) => {
    setSubRoles(prev => prev.filter(r => r.id !== id));
  }, []);

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

  const getSubRoleById = useCallback((id: string) => subRoles.find(r => r.id === id), [subRoles]);
  const getPrimaryRoleById = useCallback((id: string) => primaryRoles.find(r => r.id === id), [primaryRoles]);

  const getQualifiedSubRoles = useCallback((record: EmployeeRecord): SubRole[] => {
    return record.qualifications
      .map(q => subRoles.find(sr => sr.id === q.subRoleId))
      .filter((sr): sr is SubRole => {
        if (!sr) return false;
        if (sr.requiresRegisterAccess && !record.hasRegisterAccess) return false;
        return true;
      });
  }, [subRoles]);

  return (
    <AppContext.Provider value={{
      primaryRoles, addPrimaryRole, updatePrimaryRole, removePrimaryRole,
      subRoles, addSubRole, updateSubRole, removeSubRole,
      employeeRecords, addEmployeeRecord, updateEmployeeRecord, removeEmployeeRecord,
      appSettings, updateAppSettings,
      getSubRoleById, getPrimaryRoleById, getQualifiedSubRoles,
    }}>
      {children}
    </AppContext.Provider>
  );
}
