import { HaaldusLesson } from "../learn/lessons/Haaldus";
import { KellLesson } from "../learn/lessons/Kell";
import { NumbridLesson } from "../learn/lessons/Numbrid";
import { PaevadLesson } from "../learn/lessons/Paevad";
import { Island } from "./Island";

/** Each built lesson by its slug; `LESSON_SLUGS` in the catalogue must name the same ones. */
export const LESSON_VIEWS = {
  haaldus: HaaldusLesson,
  numbrid: NumbridLesson,
  kell: KellLesson,
  paevad: PaevadLesson,
} as const;

export default function LearnLessonPage({
  locale,
  slug,
}: {
  locale: string;
  slug: keyof typeof LESSON_VIEWS;
}) {
  const Lesson = LESSON_VIEWS[slug];
  return (
    <Island locale={locale}>
      <Lesson />
    </Island>
  );
}
