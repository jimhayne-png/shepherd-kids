export type ReviewStatus = "current" | "due_soon" | "due" | "overdue";

export interface ReviewStatusResult {
  baselineDate: Date;
  dueDate: Date;
  daysUntilDue: number;
  daysPastDue: number;
  status: ReviewStatus;
}

function toLocalDate(d: string | Date): Date {
  if (d instanceof Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
}

/**
 * Determines Annual Family Safety Review status.
 *
 * Rules:
 *   baseline = lastCompletedAt ?? registrationDate
 *   dueDate  = baseline + 12 calendar months
 *
 *   current   — more than 30 days before due date
 *   due_soon  — 1–30 days before due date
 *   due       — due date through 29 days afterward
 *   overdue   — 30 or more days past due date
 */
export function getReviewStatus(
  registrationDate: string | Date,
  lastCompletedAt: string | Date | null,
  now: Date = new Date()
): ReviewStatusResult {
  const baseline = toLocalDate(lastCompletedAt ?? registrationDate);

  const dueDate = new Date(baseline);
  dueDate.setFullYear(dueDate.getFullYear() + 1);

  const today = toLocalDate(now);
  const msDiff = dueDate.getTime() - today.getTime();
  const daysDiff = Math.round(msDiff / 86_400_000);

  const daysUntilDue = Math.max(0, daysDiff);
  const daysPastDue = Math.max(0, -daysDiff);

  let status: ReviewStatus;
  if (daysDiff > 30)       status = "current";
  else if (daysDiff >= 1)  status = "due_soon";
  else if (daysPastDue < 30) status = "due";
  else                     status = "overdue";

  return { baselineDate: baseline, dueDate, daysUntilDue, daysPastDue, status };
}
