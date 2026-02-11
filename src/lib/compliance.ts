import { ComplianceInfo, ComplianceLevel, Employee } from "@/types/shift";

/**
 * Parse HH:mm time string to a Date object for today
 */
export function parseTime(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Format a timestamp or Date to HH:mm
 */
export function formatTime(input: number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/**
 * Format minutes as Xh Ym
 */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Calculate hours worked from actual start to now (or lunch start if on lunch)
 */
export function getHoursWorked(employee: Employee): number {
  if (!employee.actualStart || employee.status !== "active") return 0;
  const start = parseTime(employee.actualStart);
  const now = new Date();
  // Subtract lunch time if completed
  let lunchMinutes = 0;
  if (employee.lunchStatus === "returned" && employee.lunchStartedAt && employee.lunchEndedAt) {
    lunchMinutes = (employee.lunchEndedAt - employee.lunchStartedAt) / 60000;
  }
  const totalMinutes = (now.getTime() - start.getTime()) / 60000 - lunchMinutes;
  return Math.max(0, totalMinutes / 60);
}

/**
 * Get minutes worked since actual start (excluding completed lunch)
 */
export function getMinutesWorkedSinceLunch(employee: Employee): number {
  if (!employee.actualStart || employee.status !== "active") return 0;
  
  // If returned from lunch, count from lunch end
  if (employee.lunchStatus === "returned" && employee.lunchEndedAt) {
    return (Date.now() - employee.lunchEndedAt) / 60000;
  }
  
  // Otherwise count from actual start
  const start = parseTime(employee.actualStart);
  return (Date.now() - start.getTime()) / 60000;
}

/**
 * Get minutes until 5th hour from actual start (before lunch taken)
 */
export function getMinutesToFifthHour(employee: Employee): number {
  if (!employee.actualStart || employee.status !== "active") return Infinity;
  if (employee.lunchStatus === "on_lunch" || employee.lunchStatus === "returned") return Infinity;
  
  const start = parseTime(employee.actualStart);
  const fiveHourMark = new Date(start.getTime() + 5 * 60 * 60000);
  return (fiveHourMark.getTime() - Date.now()) / 60000;
}

/**
 * Calculate compliance level based on hours worked since start (before lunch)
 */
export function getComplianceInfo(employee: Employee): ComplianceInfo {
  if (!employee.actualStart || employee.status !== "active") {
    return { level: "safe", hoursWorked: 0, minutesToFifthHour: Infinity, label: "Not started" };
  }
  
  if (employee.lunchStatus === "on_lunch" || employee.lunchStatus === "returned") {
    const hw = getHoursWorked(employee);
    return { level: "safe", hoursWorked: hw, minutesToFifthHour: Infinity, label: "Lunch taken" };
  }

  const start = parseTime(employee.actualStart);
  const minutesSinceStart = (Date.now() - start.getTime()) / 60000;
  const hoursSinceStart = minutesSinceStart / 60;
  const minutesToFifth = 300 - minutesSinceStart;

  let level: ComplianceLevel = "safe";
  let label = "On track";

  if (hoursSinceStart >= 5) {
    level = "violation";
    label = "VIOLATION";
  } else if (hoursSinceStart >= 4.75) {
    level = "critical";
    label = "Critical risk!";
  } else if (hoursSinceStart >= 4.5) {
    level = "urgent";
    label = "Must send soon";
  } else if (hoursSinceStart >= 4) {
    level = "warning";
    label = "Plan lunch now";
  } else if (hoursSinceStart >= 3.5) {
    level = "warning";
    label = "Soft warning";
  }

  return { level, hoursWorked: hoursSinceStart, minutesToFifthHour: minutesToFifth, label };
}

/**
 * Sort employees by who needs lunch first (closest to 5th hour)
 */
export function getLunchPriorityQueue(employees: Employee[]): Employee[] {
  return employees
    .filter(e => e.status === "active" && e.actualStart && e.lunchStatus === "not_started")
    .sort((a, b) => getMinutesToFifthHour(a) - getMinutesToFifthHour(b));
}

/**
 * Count active cashiers (not on lunch, not absent)
 */
export function getActiveCashierCount(employees: Employee[]): number {
  return employees.filter(
    e => e.status === "active" && e.lunchStatus !== "on_lunch"
  ).length;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
