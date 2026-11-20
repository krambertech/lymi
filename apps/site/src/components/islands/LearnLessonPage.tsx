import { HaaldusLesson } from "../learn/lessons/Haaldus";
import { KusimusedLesson } from "../learn/lessons/Kusimused";
import { NumbridLesson } from "../learn/lessons/Numbrid";
import { Island } from "./Island";

/** Each built lesson by its slug; `LESSON_SLUGS` in the catalogue must name the same ones. */
export const LESSON_VIEWS = {
  haaldus: HaaldusLesson,
  numbrid: NumbridLesson,
  kusimused: KusimusedLesson,
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
