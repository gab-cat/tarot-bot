// Daily limits and the "readings available" notification reset at midnight UTC,
// which is 8:00 AM in Manila. This matches how the bot has always behaved (Convex
// runs in UTC). Moving it to Manila midnight changes every user's reset time and
// would send the notification at midnight local time, so confirm with Gab first.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MANILA_TIME_ZONE = "Asia/Manila";

export function startOfDay(now: number = Date.now()): number {
  return Math.floor(now / DAY_MS) * DAY_MS;
}

export function startOfNextDay(now: number = Date.now()): number {
  return startOfDay(now) + DAY_MS;
}

/** "3h 12m" or "12m" until the next daily reset. */
export function timeUntilNextDay(now: number = Date.now()): string {
  const diffMs = startOfNextDay(now) - now;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "Oct 15, 2026" in Manila time. */
export function formatManilaDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms);
}

/** "Oct 15" in Manila time. */
export function formatManilaMonthDay(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(ms);
}

/** Date and time strings for prompts, e.g. "Saturday, November 21, 2026" and "3:04 PM". */
export function manilaNow(now: number = Date.now()): { date: string; time: string } {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  return { date, time };
}
