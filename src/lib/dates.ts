// Date helpers pinned to the school's timezone (Europe/Madrid, CET/CEST with DST).
// They do not depend on the timezone of the Node process or the browser.

export const APP_TIMEZONE = "Europe/Madrid";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface DateParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

/** Current date in Madrid as "YYYY-MM-DD". */
export function todayMadrid(): string {
  return ymdFormatter.format(new Date());
}

/** Current year, month (1-12) and day in Madrid. */
export function nowMadridParts(): DateParts {
  const [year, month, day] = todayMadrid().split("-").map(Number);
  return { year, month, day };
}

/** Calendar arithmetic on a "YYYY-MM-DD" string (timezone-independent). */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const r = new Date(Date.UTC(y, m - 1, d + days));
  return `${r.getUTCFullYear()}-${String(r.getUTCMonth() + 1).padStart(2, "0")}-${String(r.getUTCDate()).padStart(2, "0")}`;
}

/** First and last day ("YYYY-MM-DD") of the given month (1-12). */
export function monthRange(year: number, month: number): { firstDay: string; lastDay: string } {
  const mm = String(month).padStart(2, "0");
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { firstDay: `${year}-${mm}-01`, lastDay: `${year}-${mm}-${String(lastDate).padStart(2, "0")}` };
}
