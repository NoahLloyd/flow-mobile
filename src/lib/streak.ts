/**
 * Date utilities for streak display.
 * All scoring and streak computation now lives in the compute-daily-score edge function.
 */

/**
 * Format YYYY-MM-DD for N days ago.
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

/**
 * Group raw signal rows by date.
 * Input: [{ date, metric, value }, ...]
 * Output: { "2026-03-19": { exercise: true, sleep: 7, ... }, ... }
 */
export function groupSignalsByDate(
  rows: { date: string; metric: string; value: any }[]
): Record<string, Record<string, any>> {
  const grouped: Record<string, Record<string, any>> = {};
  for (const row of rows) {
    if (!grouped[row.date]) grouped[row.date] = {};
    grouped[row.date][row.metric] = row.value;
  }
  return grouped;
}
