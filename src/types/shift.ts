export type ComplianceLevel = "safe" | "warning" | "urgent" | "critical" | "violation";

export type LunchStatus = "not_started" | "pending" | "on_lunch" | "returned";
export type BreakStatus = "not_started" | "on_break" | "returned";
export type EmployeeStatus = "active" | "absent" | "off";

export interface Employee {
  id: string;
  name: string;
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

export interface ComplianceInfo {
  level: ComplianceLevel;
  hoursWorked: number;
  minutesToFifthHour: number;
  label: string;
}
