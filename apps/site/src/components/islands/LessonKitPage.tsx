import { KitDemo } from "../learn/KitDemo";
import { Island } from "./Island";

/** The lesson kit's practice parts, in the language the page's `?lang=` asks for. */
export default function LessonKitPage() {
  const lang = new URLSearchParams(window.location.search).get("lang");
  return (
    <Island locale={lang === "uk" || lang === "ru" ? lang : "en"}>
      <KitDemo />
    </Island>
  );
}
