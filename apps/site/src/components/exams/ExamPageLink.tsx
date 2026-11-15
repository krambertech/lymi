import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight } from "lucide-react";
import { EINBUERGERUNGSTEST, type Exam, examPath, examsPath } from "../../lib/exams";
import type { Locale } from "../../lib/routes";

interface Props {
  locale: Locale;
  /** The exam whose page to lead to; without one, the link leads to the exam hub. */
  exam?: Exam | undefined;
  className?: string;
}

/** The way from an exam deck, or a shelf of them, to the page that explains the exam. */
export function ExamPageLink({ locale, exam, className }: Props) {
  const { i18n } = useLingui();
  const name = exam ? i18n._(exam.name) : "";
  return (
    <a
      href={exam ? examPath(exam, locale) : examsPath(locale)}
      className={`group inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-ink-secondary transition-colors duration-150 hoverable:hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className ?? ""}`}
    >
      {!exam ? (
        <Trans>Exam prep: every test deck and its source</Trans>
      ) : exam.slug === EINBUERGERUNGSTEST ? (
        <Trans>How the Einbürgerungstest works, with a deck for each state</Trans>
      ) : (
        <Trans>{name}: the format, every deck and its source</Trans>
      )}
      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform duration-200 ease-out rtl:-scale-x-100 hoverable:group-hover:translate-x-0.5"
      />
    </a>
  );
}
