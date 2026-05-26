/**
 * Returns true if the given date is within the last 30 days.
 * For projects: pass project_date (the date filled in admin form).
 * Falls back to created_at if project_date is not set.
 * Used to automatically show/hide the "NEW" badge — no manual toggle needed.
 */
export function isNewItem(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}
