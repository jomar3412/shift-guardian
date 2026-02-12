import { ComplianceInfo, ComplianceLevel, Employee, SubRole } from "@/types/shift";

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

export function getMinutesToFifthHour(employee: Employee): number {
  if (!employee.actualStart || employee.status !== "active") return Infinity;
  if (employee.lunchStatus === "on_lunch" || employee.lunchStatus === "returned") return Infinity;
  const start = parseTime(employee.actualStart);
  const fiveHourMark = new Date(start.getTime() + 5 * 60 * 60000);
  return (fiveHourMark.getTime() - Date.now()) / 60000;
}

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

  if (hoursSinceStart >= 5) { level = "violation"; label = "VIOLATION"; }
  else if (hoursSinceStart >= 4.75) { level = "critical"; label = "Critical risk!"; }
  else if (hoursSinceStart >= 4.5) { level = "urgent"; label = "Must send soon"; }
  else if (hoursSinceStart >= 4) { level = "warning"; label = "Plan lunch now"; }
  else if (hoursSinceStart >= 3.5) { level = "warning"; label = "Soft warning"; }

  return { level, hoursWorked: hoursSinceStart, minutesToFifthHour: minutesToFifth, label };
}

export function getLunchPriorityQueue(employees: Employee[]): Employee[] {
  return employees
    .filter(e => e.status === "active" && e.actualStart && e.lunchStatus === "not_started")
    .sort((a, b) => getMinutesToFifthHour(a) - getMinutesToFifthHour(b));
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
export function sortByCompliancePriority(employees: Employee[]): Employee[] {
  const levelOrder: Record<ComplianceLevel, number> = {
    violation: 0,
    critical: 1,
    urgent: 2,
    warning: 3,
    safe: 4,
  };

  return [...employees].sort((a, b) => {
    const aInfo = getComplianceInfo(a);
    const bInfo = getComplianceInfo(b);
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
