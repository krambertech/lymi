import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { SampleCard } from "./cards";

export type Turn = { from: "you" | "them"; body: ReactNode };

interface AddedProps {
  children: ReactNode;
  card: SampleCard;
}

/** The assistant's confirmation, with the card it added as Lymi will show it. */
export function Added({ children, card }: AddedProps) {
  const { i18n } = useLingui();
  return (
    <>
      <span className="flex items-start gap-1.5">
        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-good" />
        <span>{children}</span>
      </span>
      <span className="mt-2.5 block rounded-sm bg-amber-soft px-3 py-2">
        <span className="block text-2xs tracking-[0.06em] text-amber-text uppercase">
          {i18n._(card.label)}
        </span>
        <span
          lang={card.language}
          className="mt-1 block text-md font-medium tracking-[-0.024em] text-text"
        >
          {card.term}
        </span>
        <span className="mt-0.5 block text-xs text-text-2">{i18n._(card.meaning)}</span>
      </span>
    </>
  );
}

const CHESS: SampleCard = {
  label: msg`Chess · new`,
  term: "zugzwang",
  meaning: msg`Any move you make makes your position worse`,
};

function defaultConversation(): Turn[] {
  return [
    { from: "you", body: <Trans>That chess term you just used, add it to my deck.</Trans> },
    {
      from: "them",
      body: (
        <Added card={CHESS}>
          <Trans>Added to Chess, with the meaning and an example.</Trans>
        </Added>
      ),
    },
    { from: "you", body: <Trans>And what am I due to review tonight?</Trans> },
    {
      from: "them",
      body: (
        <Trans>
          Seven cards. Four Finnish, two chess terms, one from that signal-processing paper.
        </Trans>
      ),
    },
  ];
}

interface Props {
  conversation?: Turn[] | undefined;
}

export function AssistantChat({ conversation = defaultConversation() }: Props) {
  return (
    <div className="flex max-w-[460px] flex-col gap-3">
      {conversation.map((turn, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: the script is fixed, so the index is the identity
          key={i}
          className={clsx(
            "px-3.5 py-2.5 text-sm edge",
            turn.from === "you"
              ? "max-w-[82%] self-end bg-plate-2 text-text"
              : "max-w-[88%] self-start bg-plate text-text-2",
          )}
          style={{ borderRadius: 14 }}
        >
          {turn.body}
        </div>
      ))}
    </div>
  );
}
