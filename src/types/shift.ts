export type ComplianceLevel = "safe" | "warning" | "urgent" | "critical" | "violation";

export type LunchStatus = "not_started" | "pending" | "on_lunch" | "returned";
export type BreakStatus = "not_started" | "on_break" | "returned";
export type EmployeeStatus = "active" | "absent" | "off" | "clocked_out";

export type RoleType = "standard" | "management" | "support";

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  minCoverage: number;
  coverageProtection: boolean;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  primaryRoleId: string;
  qualifiedRoleIds: string[];
  active: boolean;
  notes?: string;
}

export interface Employee {
  id: string;
  employeeRecordId: string;
  name: string;
  primaryRoleId: string;
  currentAssignmentId: string;
  scheduledStart: string; // HH:mm
  scheduledEnd: string;
  scheduledLunch?: string;
  actualStart?: string;
  actualEnd?: string;
  lunchStatus: LunchStatus;
  lunchAssignedAt?: number; // timestamp
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
