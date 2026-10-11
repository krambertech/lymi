const NARROW = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

/** The narrow weekday of each of the last `count` days, oldest first, ending today. */
export function weekLetters(count = 7, today = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (count - 1 - i));
    return NARROW.format(day);
  });
}
