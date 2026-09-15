import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import type { Section, Sections } from "../lib/api";
import { Button } from "./button";

export interface SectionProgressProps {
  sections: Section[];
  progress: NonNullable<Sections["progress"]>;
  /** Cards to review now, so Start takes the amber only when Review does not have it. */
  due: number;
  onGoTo: (sectionId: string) => void;
  onStart: (section: Section) => void;
  starting?: boolean | undefined;
}

/**
 * The row under Today's plate in a deck whose sections open in order: the section the learner is
 * on and the one next step, so a long deck never needs scrolling to find where to go on. It says
 * what opens the next section in cards, never as a percentage.
 */
export function SectionProgress({
  sections,
  progress,
  due,
  onGoTo,
  onStart,
  starting,
}: SectionProgressProps) {
  const { t, i18n } = useLingui();
  const current = sections.find((s) => s.id === progress.currentId);
  const next = sections.find((s) => s.id === progress.nextId);
  if (!current) return null;

  const currentName = current.name;
  const nextName = next?.name ?? "";
  const known = i18n.number(current.known);
  const needed = i18n.number(current.knownNeeded);

  const goTo = (
    <Button
      size="sm"
      variant="ghost"
      className="-ms-2 px-2 text-text-2"
      onClick={() => onGoTo(current.id)}
      aria-label={t`Go to ${currentName}`}
    >
      {next && progress.ready ? <Trans>Go to {currentName}</Trans> : <Trans>Go to section</Trans>}
    </Button>
  );

  let title: string;
  let detail: ReactNode;
  if (!next) {
    title = t`Every section is open`;
    detail = (
      <Plural
        value={current.total}
        one={`You know ${known} of # card in ${currentName}, the last section.`}
        other={`You know ${known} of # cards in ${currentName}, the last section.`}
      />
    );
  } else if (progress.ready) {
    title = t`${nextName} is ready`;
    detail = (
      <Plural
        value={current.total}
        one={`You know ${known} of # card in ${currentName}.`}
        other={`You know ${known} of # cards in ${currentName}.`}
      />
    );
  } else if (current.notStarted > 0 && current.known >= current.knownNeeded) {
    title = currentName;
    detail = (
      <Plural
        value={current.notStarted}
        one={`${nextName} opens once the last card of ${currentName} comes up in review.`}
        other={`${nextName} opens once the last # cards of ${currentName} come up in review.`}
      />
    );
  } else {
    title = currentName;
    detail = (
      <Plural
        value={current.total}
        one={`${nextName} opens when you know ${needed} of # card.`}
        other={`${nextName} opens when you know ${needed} of # cards.`}
      />
    );
  }

  const showMeter = !!next && !progress.ready && current.total > 0;
  const share = current.total > 0 ? current.known / current.total : 0;
  const tick = current.total > 0 ? current.knownNeeded / current.total : 0;

  return (
    <div className="grid gap-3 border-t border-edge px-5 pt-3.5 pb-4 @md/plates:ps-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
          <p className="text-md font-medium text-balance text-text">{title}</p>
          <p className="text-sm text-text-2">{detail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {goTo}
          {next && progress.ready && (
            <Button
              size="sm"
              variant={due > 0 ? "secondary" : "primary"}
              loading={starting}
              onClick={() => onStart(next)}
            >
              <Trans>Start {nextName}</Trans>
            </Button>
          )}
        </div>
      </div>
      {showMeter && (
        <div aria-hidden="true" className="relative h-1.5 rounded-full bg-plate-2">
          <div
            className="absolute inset-y-0 start-0 rounded-full bg-state-known transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(1, share) * 100}%` }}
          />
          <div
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-text-2 rtl:translate-x-1/2"
            style={{ insetInlineStart: `${tick * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
