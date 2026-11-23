import { kitLocale } from "../../lib/learn/kit-locale";
import { LearnPage } from "../learn/learn-page";

export default function LessonKitPage() {
  const locale = kitLocale();
  return (
    <div lang={locale}>
      <LearnPage target={{ kind: "kit" }} locale={locale} />
    </div>
  );
}
