import { msg } from "@lingui/core/macro";
import { HubView } from "../learn/HubView";
import { Island } from "./Island";

export const LEARN_TITLE = msg`Free Estonian grammar lessons · Lymi`;
export const LEARN_BLURB = msg`Short, free lessons in Estonian grammar, from the first sounds to B1. Hear every word, try each idea and check yourself with a quick quiz.`;

export default function LearnHubPage({ locale }: { locale: string }) {
  return (
    <Island locale={locale}>
      <HubView />
    </Island>
  );
}
