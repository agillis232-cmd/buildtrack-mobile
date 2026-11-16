// Calendar-day helpers.
//
// The server stores "day" values (schedule dates, due dates, expense dates) as that day at
// midnight UTC. Turning those into a JS Date and reading them in Pacific time lands on the
// previous afternoon, and Date.toISOString() on a local date flips to tomorrow after 4-5pm.
// Everything that means "a calendar day" should go through these instead.

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

/** "YYYY-MM-DD" for the day the phone's own clock says it is. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "YYYY-MM-DD" for a day value from the server ("2026-11-20" or "2026-11-20T00:00:00.000Z"). */
export function dateKeyOf(value: string | Date | null | undefined): string {
  if (!value) return ""
  if (value instanceof Date) return toDateKey(value)
  return value.slice(0, 10)
}

/** A day value from the server as a local Date on that same calendar day (at noon, so DST can't move it). */
export function parseDateOnly(value: string | Date | null | undefined): Date {
  const key = dateKeyOf(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return new Date(NaN)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
}

/** A time label as the app saves it ("02:30 PM", also accepts "14:30") as a Date today, or null. */
export function parseTimeLabel(label: string | null | undefined): Date | null {
  if (!label) return null
  const match = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?\s*$/.exec(label)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === "PM" && hours < 12) hours += 12
  if (meridiem === "AM" && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}
