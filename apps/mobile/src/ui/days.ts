/** The narrow weekday of each of the last `count` days in `locale`, oldest first, ending today. */
export function weekLetters(locale: string, count = 7, today = new Date()): string[] {
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (count - 1 - i));
    return narrow.format(day);
  });
}
