import { useLingui } from "@lingui/react/macro";
import { type KnownReadings, textDirection } from "@lymi/core";
import type { ReactNode } from "react";
import { ExampleText } from "./term-text";

interface Props {
  example: string;
  language?: string | null | undefined;
  known?: KnownReadings | undefined;
  translation?: string | null | undefined;
  /** Follows the translation, such as the AI's badge when the AI wrote only the translation. */
  badge?: ReactNode;
  /** Right after the example's last word, before its translation, such as its play control. */
  after?: ReactNode;
  className?: string | undefined;
}

/**
 * An example and its translation in parentheses, run on after it in `muted`. A translation that
 * reads in the other direction gets its own line, because a run-on would start at the wrong edge.
 */
export function ExampleLines({
  example,
  language,
  known,
  translation,
  badge,
  after,
  className,
}: Props) {
  const { i18n } = useLingui();
  const lang = language ?? undefined;
  const runsOn = textDirection(language) === textDirection(i18n.locale);
  // In the meaning language, like the meaning, so it takes its language and direction from it.
  const translated = translation && (
    <span lang={i18n.locale} dir="auto" className="text-muted">
      ({translation}){badge && <span className="ms-1.5 inline-flex align-[0.0625em]">{badge}</span>}
    </span>
  );
  const sentence = (
    <p lang={lang} dir={textDirection(language)} className={className}>
      <ExampleText text={example} lang={lang} known={known} />
      {after}
      {runsOn && translated && <> {translated}</>}
    </p>
  );
  if (runsOn || !translated) return sentence;
  return (
    <div className="grid gap-1">
      {sentence}
      <p className={className}>{translated}</p>
    </div>
  );
}
