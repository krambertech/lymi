import { numberWords } from "./estonian-numbers";

/**
 * Times on a twelve-hour clock as Estonian says them, in the forms the time lesson teaches.
 * Each form follows an example in EKSS (Eesti keele seletav sõnaraamat): “Kell on veerand neli.”,
 * “Kell on pool kaksteist.”, “kolmveerand kaks”, “kolm minutit kaheksa läbi” and
 * “viie minuti pärast üks”. Twenty-five past and twenty-five to are left out: their usual forms
 * need cases the course hasn't reached.
 */
export const MINUTES = [0, 5, 10, 15, 20, 30, 40, 45, 50, 55] as const;
export type Minute = (typeof MINUTES)[number];

export interface ClockTime {
  /** 1 to 12. */
  hour: number;
  minute: Minute;
}

/** Which hour a time is named after: the one that has struck, or the one that is coming. */
export type HourRole = "struck" | "coming";

/** A time's words in parts; `hour` marks the hour's word, which a lesson lights. */
export type TimePart = { text: string; hour?: HourRole };

/** The minutes before the hour, in the form “… minuti pärast” takes. */
const MINUTES_TO: Partial<Record<number, string>> = { 5: "viie", 10: "kümne", 20: "kahekümne" };

const hourWord = (hour: number) => numberWords(hour);
export const nextHour = (hour: number) => (hour % 12) + 1;

export function timeParts({ hour, minute }: ClockTime): TimePart[] {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) throw new RangeError(`No hour ${hour}`);
  const coming = { text: hourWord(nextHour(hour)), hour: "coming" } as const;
  const struck = { text: hourWord(hour), hour: "struck" } as const;
  switch (minute) {
    case 0:
      return [struck];
    case 15:
      return [{ text: "veerand " }, coming];
    case 30:
      return [{ text: "pool " }, coming];
    case 45:
      return [{ text: "kolmveerand " }, coming];
    case 5:
    case 10:
    case 20:
      return [{ text: `${numberWords(minute)} minutit ` }, struck, { text: " läbi" }];
    default:
      return [{ text: `${MINUTES_TO[60 - minute]} minuti pärast ` }, coming];
  }
}

/** “pool neli” */
export function timeWords(time: ClockTime): string {
  return timeParts(time)
    .map((part) => part.text)
    .join("");
}

/** “Kell on pool neli.”, what each of the lesson's clips says. */
export function timeSentence(time: ClockTime): string {
  return `Kell on ${timeWords(time)}.`;
}

/** “3:30” */
export function timeDigits({ hour, minute }: ClockTime): string {
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

export const timeClip = ({ hour, minute }: ClockTime) =>
  `k${hour}-${String(minute).padStart(2, "0")}`;

/** Every time the lesson can say, from 1:00 to 12:55. */
export const ALL_TIMES: readonly ClockTime[] = Array.from({ length: 12 }, (_, i) => i + 1).flatMap(
  (hour) => MINUTES.map((minute) => ({ hour, minute })),
);

/**
 * Whether a typed time is this one. Takes 3:30, 3.30, 3,30, 330 and 03:30, and the afternoon's
 * 15:30 too; a full hour may be just its number.
 */
export function timeMatches(typed: string, { hour, minute }: ClockTime): boolean {
  const match = typed.trim().match(/^(\d{1,2})(?:\s*[:.,]?\s*(\d{2}))?$/);
  if (!match) return false;
  const h = Number(match[1]);
  const m = match[2] === undefined ? 0 : Number(match[2]);
  if (h > 24 || m !== minute) return false;
  return h % 12 === hour % 12;
}
