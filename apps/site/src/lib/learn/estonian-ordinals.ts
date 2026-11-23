import type { NumberPart } from "./estonian-numbers";

const GENITIVES = [
  "",
  "ühe",
  "kahe",
  "kolme",
  "nelja",
  "viie",
  "kuue",
  "seitsme",
  "kaheksa",
  "üheksa",
];

const UNITS: readonly (readonly [string, string])[] = [
  ["", ""],
  ["", "esimene"],
  ["", "teine"],
  ["kolm", "as"],
  ["nelja", "s"],
  ["viie", "s"],
  ["kuue", "s"],
  ["seitsme", "s"],
  ["kaheksa", "s"],
  ["üheksa", "s"],
  ["kümne", "s"],
];

const unitParts = (n: number): NumberPart[] => {
  const [stem, ending] = UNITS[n] as readonly [string, string];
  return [...(stem ? [{ text: stem }] : []), { text: ending, ending: true }];
};

export function ordinalParts(n: number): NumberPart[] {
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new RangeError(`No ordinal for ${n}`);
  if (n <= 10) return unitParts(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (n < 20) return [{ text: `${GENITIVES[ones]}teistkümne` }, { text: "s", ending: true }];
  if (ones === 0) return [{ text: `${GENITIVES[tens]}kümne` }, { text: "s", ending: true }];
  return [{ text: `${GENITIVES[tens]}kümne ` }, ...unitParts(ones)];
}

export function ordinalWords(n: number): string {
  return ordinalParts(n)
    .map((part) => part.text)
    .join("");
}

export function ordinalOn(n: number): string {
  const word = ordinalWords(n);
  if (word.endsWith("esimene")) return `${word.slice(0, -"esimene".length)}esimesel`;
  if (word.endsWith("teine")) return `${word.slice(0, -"teine".length)}teisel`;
  return `${word.slice(0, -1)}ndal`;
}

export const MONTHS = [
  { name: "jaanuar", on: "jaanuaril" },
  { name: "veebruar", on: "veebruaril" },
  { name: "märts", on: "märtsil" },
  { name: "aprill", on: "aprillil" },
  { name: "mai", on: "mail" },
  { name: "juuni", on: "juunil" },
  { name: "juuli", on: "juulil" },
  { name: "august", on: "augustil" },
  { name: "september", on: "septembril" },
  { name: "oktoober", on: "oktoobril" },
  { name: "november", on: "novembril" },
  { name: "detsember", on: "detsembril" },
] as const;

export const writtenDate = (day: number, month: number) =>
  `${day}. ${MONTHS[month - 1]?.name ?? ""}`;

const MONTH_STARTS: readonly (readonly [string, number])[] = (
  [
    ["jaan", 1],
    ["jan", 1],
    ["січ", 1],
    ["янв", 1],
    ["veeb", 2],
    ["feb", 2],
    ["лют", 2],
    ["фев", 2],
    ["märts", 3],
    ["mär", 3],
    ["mar", 3],
    ["бер", 3],
    ["мар", 3],
    ["apr", 4],
    ["кві", 4],
    ["апр", 4],
    ["mai", 5],
    ["may", 5],
    ["тра", 5],
    ["мая", 5],
    ["май", 5],
    ["juuni", 6],
    ["jun", 6],
    ["чер", 6],
    ["июн", 6],
    ["juuli", 7],
    ["jul", 7],
    ["лип", 7],
    ["июл", 7],
    ["aug", 8],
    ["сер", 8],
    ["авг", 8],
    ["sep", 9],
    ["вер", 9],
    ["сен", 9],
    ["okt", 10],
    ["oct", 10],
    ["жов", 10],
    ["окт", 10],
    ["nov", 11],
    ["лис", 11],
    ["ноя", 11],
    ["dets", 12],
    ["dec", 12],
    ["гру", 12],
    ["дек", 12],
  ] as const
).toSorted((a, b) => b[0].length - a[0].length);

const monthOf = (word: string): number | undefined =>
  MONTH_STARTS.find(([start]) => word.startsWith(start))?.[1];

export function dateMatches(typed: string, day: number, month: number): boolean {
  const text = typed.trim().toLowerCase().replace(/\s+/g, " ");
  const digits = text.match(/^(\d{1,2})\s*([./,\- ])\s*(\d{1,2})\.?(?:\s*[./,-]?\s*\d{2,4})?$/);
  if (digits) {
    const a = Number(digits[1]);
    const b = Number(digits[3]);
    if (a === day && b === month) return true;
    return digits[2] === "/" && a === month && b === day;
  }
  const words = text
    .replace(/(\d)(?:st|nd|rd|th|-?го|-?е)(?=[\s.,]|$)/g, "$1")
    .split(/[\s.,]+/)
    .filter((word) => word && word !== "of" && word !== "the");
  const numbers = words.filter((word) => /^\d+$/.test(word) && word.length <= 2).map(Number);
  const months = words.flatMap((word) => monthOf(word) ?? []);
  return numbers.length === 1 && numbers[0] === day && months.length === 1 && months[0] === month;
}
