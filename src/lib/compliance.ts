import { ComplianceInfo, ComplianceLevel, Employee, ShiftSettings, SubRole } from "@/types/shift";

function getMealPolicy(settings?: ShiftSettings) {
  return {
    deadlineHours: settings?.mealDeadlineHours ?? 5,
    warningMinutes: settings?.warningMinutesBeforeDeadline ?? 60,
    urgentMinutes: settings?.urgentMinutesBeforeDeadline ?? 30,
    criticalMinutes: settings?.criticalMinutesBeforeDeadline ?? 15,
  };
}

export function parseTime(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatTime(input: number | Date, format: "12h" | "24h" = "12h"): string {
  const d = input instanceof Date ? input : new Date(input);
  if (format === "24h") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function getHoursWorked(employee: Employee): number {
  if (!employee.actualStart || (employee.status !== "active" && employee.status !== "clocked_out")) return 0;
  const start = parseTime(employee.actualStart);
  const now = employee.status === "clocked_out" && employee.actualEnd ? parseTime(employee.actualEnd) : new Date();
  let lunchMinutes = 0;
  if (employee.lunchStatus === "returned" && employee.lunchStartedAt && employee.lunchEndedAt) {
    lunchMinutes = (employee.lunchEndedAt - employee.lunchStartedAt) / 60000;
  }
  const totalMinutes = (now.getTime() - start.getTime()) / 60000 - lunchMinutes;
  return Math.max(0, totalMinutes / 60);
}

export function getMinutesToFifthHour(employee: Employee, settings?: ShiftSettings): number {
  if (!employee.actualStart || employee.status !== "active") return Infinity;
  if (employee.lunchStatus === "on_lunch" || employee.lunchStatus === "returned") return Infinity;
  const policy = getMealPolicy(settings);
  const start = parseTime(employee.actualStart);
  const mealDeadline = new Date(start.getTime() + policy.deadlineHours * 60 * 60000);
  return (mealDeadline.getTime() - Date.now()) / 60000;
}

export function getComplianceInfo(employee: Employee, settings?: ShiftSettings): ComplianceInfo {
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
  const policy = getMealPolicy(settings);
  const minutesToDeadline = policy.deadlineHours * 60 - minutesSinceStart;

  let level: ComplianceLevel = "safe";
  let label = "On track";

  if (minutesToDeadline <= 0) { level = "violation"; label = "VIOLATION"; }
  else if (minutesToDeadline <= policy.criticalMinutes) { level = "critical"; label = "Critical risk!"; }
  else if (minutesToDeadline <= policy.urgentMinutes) { level = "urgent"; label = "Must send soon"; }
  else if (minutesToDeadline <= policy.warningMinutes) { level = "warning"; label = "Plan lunch now"; }

  return { level, hoursWorked: hoursSinceStart, minutesToFifthHour: minutesToDeadline, label };
}

export function getLunchPriorityQueue(employees: Employee[], settings?: ShiftSettings): Employee[] {
  return employees
    .filter(e => e.status === "active" && e.actualStart && e.lunchStatus === "not_started")
    .sort((a, b) => getMinutesToFifthHour(a, settings) - getMinutesToFifthHour(b, settings));
}

export function getActiveCountByRole(employees: Employee[], subRoleId: string): number {
  return employees.filter(
    e => e.status === "active" && e.lunchStatus !== "on_lunch" && e.currentAssignmentId === subRoleId
  ).length;
}

export function checkCoverageForLunch(employees: Employee[], employeeId: string, subRoles: SubRole[]): { safe: boolean; warnings: string[] } {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return { safe: true, warnings: [] };
  const warnings: string[] = [];
  const subRoleId = emp.currentAssignmentId;
  const subRole = subRoles.find(r => r.id === subRoleId);
  if (subRole && subRole.coverageProtection) {
    const current = getActiveCountByRole(employees, subRoleId);
    if (current - 1 < subRole.minCoverage) {
      warnings.push(`Sending ${emp.name} to lunch drops ${subRole.name} below minimum (${subRole.minCoverage}).`);
    }
  }
  return { safe: warnings.length === 0, warnings };
}

/** Sort employees by compliance priority for dashboard display */
export function sortByCompliancePriority(employees: Employee[], settings?: ShiftSettings): Employee[] {
  const levelOrder: Record<ComplianceLevel, number> = {
    violation: 0,
    critical: 1,
    urgent: 2,
    warning: 3,
    safe: 4,
  };

  return [...employees].sort((a, b) => {
    const aInfo = getComplianceInfo(a, settings);
    const bInfo = getComplianceInfo(b, settings);
    // Active first, then by compliance level
    if (a.status !== b.status) {
      if (a.status === "active") return -1;
      if (b.status === "active") return 1;
    }
    return (levelOrder[aInfo.level] ?? 5) - (levelOrder[bInfo.level] ?? 5);
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
