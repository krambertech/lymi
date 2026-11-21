import { EitusLesson } from "../learn/lessons/Eitus";
import { HaaldusLesson } from "../learn/lessons/Haaldus";
import { KaskivLesson } from "../learn/lessons/Kaskiv";
import { KellLesson } from "../learn/lessons/Kell";
import { KohadLesson } from "../learn/lessons/Kohad";
import { KusimusedLesson } from "../learn/lessons/Kusimused";
import { MinaSinaTemaLesson } from "../learn/lessons/MinaSinaTema";
import { NumbridLesson } from "../learn/lessons/Numbrid";
import { OlevikLesson } from "../learn/lessons/Olevik";
import { OsastavLesson } from "../learn/lessons/Osastav";
import { PaevadLesson } from "../learn/lessons/Paevad";
import { PaevTallinnasLesson } from "../learn/lessons/PaevTallinnas";
import { SobragaRahataLesson } from "../learn/lessons/SobragaRahata";
import { TutvumineLesson } from "../learn/lessons/Tutvumine";
import { VerbiPohivormidLesson } from "../learn/lessons/VerbiPohivormid";
import { Island } from "./Island";

/** Each built lesson by its slug; `LESSON_SLUGS` in the catalogue must name the same ones. */
export const LESSON_VIEWS = {
  haaldus: HaaldusLesson,
  numbrid: NumbridLesson,
  "mina-sina-tema": MinaSinaTemaLesson,
  eitus: EitusLesson,
  kusimused: KusimusedLesson,
  kohad: KohadLesson,
  olevik: OlevikLesson,
  kell: KellLesson,
  paevad: PaevadLesson,
  tutvumine: TutvumineLesson,
  kaskiv: KaskivLesson,
  "paev-tallinnas": PaevTallinnasLesson,
  "sobraga-rahata": SobragaRahataLesson,
  "verbi-pohivormid": VerbiPohivormidLesson,
  osastav: OsastavLesson,
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
