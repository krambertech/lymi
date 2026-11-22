import { LearnPage } from "../learn/learn-page";

export default function LessonKitPage() {
  const lang = new URLSearchParams(window.location.search).get("lang");
  return (
    <LearnPage target={{ kind: "kit" }} locale={lang === "uk" || lang === "ru" ? lang : "en"} />
  );
}
