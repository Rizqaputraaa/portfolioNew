/**
 * Returns true if the item was created within the last 30 days.
 * Used to automatically show/hide the "NEW" badge — no manual toggle needed.
 */
export function isNewItem(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}
