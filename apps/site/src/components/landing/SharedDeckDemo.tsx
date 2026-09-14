import type { MessageDescriptor } from "@lingui/core";
import { Plural, Trans, useLingui } from "@lingui/react/macro";

/**
 * Classmates drawn with DiceBear's Notionists style (CC0, a remix of Zoish's Notionists), baked
 * to `/avatars/<name>.svg` with a pastel disc so they read in both rooms.
 */
const MEMBERS = ["mari", "jonas", "aiko"];
const MORE_MEMBERS = 9;

interface Props {
  name: MessageDescriptor;
  /** BCP 47 tag of the deck's terms. */
  language: string;
  cards: { term: string; meaning: MessageDescriptor }[];
}

/** A class deck at rest: who has joined, and what the owner added after this week's lesson. */
export function SharedDeckDemo({ name, language, cards }: Props) {
  const { i18n } = useLingui();
  const learners = MEMBERS.length + MORE_MEMBERS;

  return (
    <div className="mx-auto max-w-[440px] rounded-xl bg-plate p-5 edge @2xl:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-medium tracking-[-0.02em] text-text">{i18n._(name)}</p>
          <p className="mt-0.5 text-sm text-muted tabular-nums">
            <Plural value={learners} one="# learner" other="# learners" />
          </p>
        </div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {MEMBERS.map((member) => (
            <img
              key={member}
              src={`/avatars/${member}.svg`}
              alt=""
              width={32}
              height={32}
              className="-ms-2 size-8 rounded-full ring-2 ring-plate first:ms-0"
            />
          ))}
          <span className="-ms-2 flex h-8 items-center justify-center rounded-full bg-plate-2 px-2 text-2xs font-medium text-muted tabular-nums ring-2 ring-plate">
            +{MORE_MEMBERS}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        <Trans>Added after this week’s lesson</Trans>
      </p>
      <ul className="mt-2 flex flex-col">
        {cards.map((card) => (
          <li key={card.term} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p lang={language} className="truncate text-md font-medium text-text">
                {card.term}
              </p>
              <p className="truncate text-sm text-muted">{i18n._(card.meaning)}</p>
            </div>
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-plate-2 px-2.5 text-xs text-text-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-state-new" />
              <Trans>New</Trans>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
