export type ComplianceLevel = "safe" | "warning" | "urgent" | "critical" | "violation";

export type LunchStatus = "not_started" | "pending" | "on_lunch" | "returned";
export type BreakStatus = "not_started" | "on_break" | "returned";
export type EmployeeStatus = "active" | "absent" | "off" | "clocked_out";

export type RoleType = "standard" | "management" | "support";

/** Primary Job Title - permanent position like "Front-End Teaming Associate" */
export interface PrimaryRole {
  id: string;
  name: string;
  type: RoleType;
}

/** Sub-Role / Assignment - where they can actually work, like "Cashier", "Self-Checkout" */
export interface SubRole {
  id: string;
  name: string;
  requiresRegisterAccess: boolean;
  minCoverage: number;
  coverageProtection: boolean;
  notes?: string;
}

/** Per-employee qualification for a sub-role */
export interface QualificationEntry {
  subRoleId: string;
  notes?: string; // e.g. "Does not prefer SCO" or "Needs retraining"
}

export interface EmployeeRecord {
  id: string;
  name: string;
  primaryRoleId: string;
  qualifications: QualificationEntry[];
  hasRegisterAccess: boolean;
  active: boolean;
  notes?: string;
}

export interface Employee {
  id: string;
  employeeRecordId: string;
  name: string;
  primaryRoleId: string;
  currentAssignmentId: string; // sub-role id
  scheduledStart: string; // HH:mm
  scheduledEnd: string;
  scheduledLunch?: string;
  actualStart?: string;
  actualEnd?: string;
  lunchStatus: LunchStatus;
  lunchAssignedAt?: number;
  lunchStartedAt?: number;
  lunchEndedAt?: number;
  breakStatus: BreakStatus;
  breakStartedAt?: number;
  breakEndedAt?: number;
  status: EmployeeStatus;
}

export interface ShiftSettings {
  minCashiers: number;
  gracePeriodMinutes: number;
  overtimeThresholdHours: number;
}

export interface AppSettings {
  darkMode: boolean;
  timeFormat: "12h" | "24h";
}

export interface ComplianceInfo {
  level: ComplianceLevel;
  hoursWorked: number;
  minutesToFifthHour: number;
  label: string;
}

/** Action record for undo system */
export interface UndoAction {
  id: string;
  label: string;
  undo: () => void;
  timestamp: number;
}
