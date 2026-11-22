import { LearnPage } from "../learn/learn-page";

export default function LessonKitPage() {
  const lang = new URLSearchParams(window.location.search).get("lang");
  const locale = lang === "uk" || lang === "ru" ? lang : "en";
  return (
    <div lang={locale}>
      <LearnPage target={{ kind: "kit" }} locale={locale} />
    </div>
  );
}
