import { msg } from "@lingui/core/macro";
import { LearnPage } from "../learn/learn-page";

export const REVIEW_TITLE = msg`Review your Estonian lessons · Lymi`;
export const REVIEW_BLURB = msg`Questions from the Estonian lessons you’ve drilled, each back on the day it’s due. They stay in your browser, with no account.`;

export default function LearnReviewPage({ locale }: { locale: string }) {
  return <LearnPage target={{ kind: "review" }} locale={locale} />;
}
