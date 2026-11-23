import { kitLocale } from "../../lib/learn/kit-locale";
import LearnReload from "./LearnReload";

export default function LessonKitReload() {
  return <LearnReload locale={kitLocale()} />;
}
