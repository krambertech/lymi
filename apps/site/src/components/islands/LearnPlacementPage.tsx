import { msg } from "@lingui/core/macro";
import { LearnPage } from "../learn/learn-page";

export const PLACEMENT_TITLE = msg`Estonian placement test · Lymi`;
export const PLACEMENT_BLURB = msg`Find where to start in the free Estonian grammar course: eighteen questions from A1 basics to B1 sentences, with a suggested starting stage and links to each rule.`;

export default function LearnPlacementPage({ locale }: { locale: string }) {
  return <LearnPage target={{ kind: "placement" }} locale={locale} />;
}
