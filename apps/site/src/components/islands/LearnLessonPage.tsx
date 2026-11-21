import { EitusLesson } from "../learn/lessons/Eitus";
import { HaaldusLesson } from "../learn/lessons/Haaldus";
import { JalgJalaLesson } from "../learn/lessons/JalgJala";
import { KaskivLesson } from "../learn/lessons/Kaskiv";
import { KellLesson } from "../learn/lessons/Kell";
import { KohadLesson } from "../learn/lessons/Kohad";
import { KusimusedLesson } from "../learn/lessons/Kusimused";
import { LaheksinLesson } from "../learn/lessons/Laheksin";
import { LahmeLasLesson } from "../learn/lessons/LahmeLas";
import { LaualLaualeLaualtLesson } from "../learn/lessons/LaualLaualeLaualt";
import { LihtminevikLesson } from "../learn/lessons/Lihtminevik";
import { MaEiLainudLesson } from "../learn/lessons/MaEiLainud";
import { MajadesInimesteleLesson } from "../learn/lessons/MajadesInimestele";
import { MajasMajjaMajastLesson } from "../learn/lessons/MajasMajjaMajast";
import { MeeldimaLesson } from "../learn/lessons/Meeldima";
import { MinaSinaTemaLesson } from "../learn/lessons/MinaSinaTema";
import { MitmusLesson } from "../learn/lessons/Mitmus";
import { ModaalverbidLesson } from "../learn/lessons/Modaalverbid";
import { MulOnLesson } from "../learn/lessons/MulOn";
import { NadalavahetuselLesson } from "../learn/lessons/Nadalavahetusel";
import { NumbridLesson } from "../learn/lessons/Numbrid";
import { OlenLugenudLesson } from "../learn/lessons/OlenLugenud";
import { OlevikLesson } from "../learn/lessons/Olevik";
import { OmastavLesson } from "../learn/lessons/Omastav";
import { OsastavLesson } from "../learn/lessons/Osastav";
import { PaevadLesson } from "../learn/lessons/Paevad";
import { PaevTallinnasLesson } from "../learn/lessons/PaevTallinnas";
import { PealAllTagaLesson } from "../learn/lessons/PealAllTaga";
import { PohivormidLesson } from "../learn/lessons/Pohivormid";
import { PoodPoeLesson } from "../learn/lessons/PoodPoe";
import { RaagitakseLesson } from "../learn/lessons/Raagitakse";
import { RaamatuidMajuLesson } from "../learn/lessons/RaamatuidMaju";
import { RaamatutVoiRaamatuLesson } from "../learn/lessons/RaamatutVoiRaamatu";
import { SobragaRahataLesson } from "../learn/lessons/SobragaRahata";
import { TulevikLesson } from "../learn/lessons/Tulevik";

import { TegevusnimedLesson } from "../learn/lessons/Tegevusnimed";
import { TurulLesson } from "../learn/lessons/Turul";
import { TutvumineLesson } from "../learn/lessons/Tutvumine";
import { UjumaUjumasUjumastLesson } from "../learn/lessons/UjumaUjumasUjumast";
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
  modaalverbid: ModaalverbidLesson,
  "laual-lauale-laualt": LaualLaualeLaualtLesson,
  "peal-all-taga": PealAllTagaLesson,
  "sobraga-rahata": SobragaRahataLesson,
  "mul-on": MulOnLesson,
  "pood-poe": PoodPoeLesson,
  pohivormid: PohivormidLesson,
  omastav: OmastavLesson,
  "majas-majja-majast": MajasMajjaMajastLesson,
  meeldima: MeeldimaLesson,
  turul: TurulLesson,
  "verbi-pohivormid": VerbiPohivormidLesson,
  tegevusnimed: TegevusnimedLesson,
  "ujuma-ujumas-ujumast": UjumaUjumasUjumastLesson,
  osastav: OsastavLesson,
  lihtminevik: LihtminevikLesson,
  "ma-ei-lainud": MaEiLainudLesson,
  tulevik: TulevikLesson,
  nadalavahetusel: NadalavahetuselLesson,
  "jalg-jala": JalgJalaLesson,
  "raamatut-voi-raamatu": RaamatutVoiRaamatuLesson,
  "raamatuid-maju": RaamatuidMajuLesson,
  "majades-inimestele": MajadesInimesteleLesson,
  "olen-lugenud": OlenLugenudLesson,
  laheksin: LaheksinLesson,
  "lahme-las": LahmeLasLesson,
  raagitakse: RaagitakseLesson,
  mitmus: MitmusLesson,
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
