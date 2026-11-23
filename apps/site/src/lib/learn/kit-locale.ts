export function kitLocale(): "en" | "uk" | "ru" {
  const lang = new URLSearchParams(window.location.search).get("lang");
  return lang === "uk" || lang === "ru" ? lang : "en";
}
