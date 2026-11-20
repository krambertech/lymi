import { EitusLesson } from "../learn/lessons/Eitus";
import { HaaldusLesson } from "../learn/lessons/Haaldus";
import { KellLesson } from "../learn/lessons/Kell";
import { KusimusedLesson } from "../learn/lessons/Kusimused";
import { MinaSinaTemaLesson } from "../learn/lessons/MinaSinaTema";
import { NumbridLesson } from "../learn/lessons/Numbrid";
import { OlevikLesson } from "../learn/lessons/Olevik";
import { Island } from "./Island";

/** Each built lesson by its slug; `LESSON_SLUGS` in the catalogue must name the same ones. */
export const LESSON_VIEWS = {
  haaldus: HaaldusLesson,
  numbrid: NumbridLesson,
  "mina-sina-tema": MinaSinaTemaLesson,
  eitus: EitusLesson,
  kusimused: KusimusedLesson,
  olevik: OlevikLesson,
  kell: KellLesson,
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
