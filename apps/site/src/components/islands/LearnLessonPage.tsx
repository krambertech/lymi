import { LearnPage } from "../learn/learn-page";

export default function LearnLessonPage({ locale, slug }: { locale: string; slug: string }) {
  return <LearnPage target={{ kind: "lesson", slug }} locale={locale} />;
}
