import { msg } from "@lingui/core/macro";
import { HubView } from "../learn/HubView";
import { Island } from "./Island";

export const LEARN_TITLE = msg`Free Estonian grammar lessons · Lymi`;
export const LEARN_BLURB = msg`Free Estonian lessons with audio and quizzes. Start with pronunciation and numbers. More lessons are planned.`;

export default function LearnHubPage({ locale }: { locale: string }) {
  return (
    <Island locale={locale}>
      <HubView />
    </Island>
  );
}
