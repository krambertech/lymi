import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { FileText, Image } from "lucide-react";
import type { ReactNode } from "react";
import { LearnerBubble, ToolCall, UsingLymi } from "./ChatParts";
import type { SampleCard } from "./cards";
import { SmallCard } from "./SmallCard";

export type Turn = {
  from: "you" | "them";
  body: ReactNode;
  /** A file the learner sends with the message: an `Attachment`, shown above the bubble. */
  attachment?: ReactNode;
};

interface AddedProps {
  children: ReactNode;
  card: SampleCard;
}

/** The assistant's confirmation: the call to Lymi, what it did, and the card it added. */
export function Added({ children, card }: AddedProps) {
  const { i18n } = useLingui();
  return (
    <div className="flex flex-col items-start gap-2">
      <ToolCall>
        <UsingLymi done />
      </ToolCall>
      <p>{children}</p>
      <ul className="w-full max-w-[280px]">
        <SmallCard
          label={i18n._(card.label)}
          term={card.term}
          meaning={i18n._(card.meaning)}
          lang={card.language}
        />
      </ul>
    </div>
  );
}

interface AttachmentProps {
  name: string;
  /** What kind of file it is, said as the chat app would. */
  kind: ReactNode;
  photo?: boolean;
}

/** A file sent with the learner's message, shown the way a chat app shows an attachment. */
export function Attachment({ name, kind, photo }: AttachmentProps) {
  const Icon = photo ? Image : FileText;
  return (
    <span className="flex items-center gap-2.5 rounded-sm bg-plate py-2 ps-2 pe-3 edge">
      <span className="grid size-8 shrink-0 place-items-center rounded-xs bg-amber-soft text-amber-text">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-ink">{name}</span>
        <span className="block text-2xs text-ink-muted">{kind}</span>
      </span>
    </span>
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

/**
 * A short scripted chat with an assistant: the learner in ink at the end of the row, the
 * assistant's answers as plain text, as every chat app sets them.
 */
export function AssistantChat({ conversation = defaultConversation() }: Props) {
  return (
    <div className="flex max-w-[460px] flex-col gap-3">
      {conversation.map((turn, i) =>
        turn.from === "you" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the script is fixed, so the index is the identity
          <div key={i} className="flex flex-col items-end gap-2">
            {turn.attachment}
            <LearnerBubble>{turn.body}</LearnerBubble>
          </div>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the script is fixed, so the index is the identity
          <div key={i} className="max-w-[88%] self-start text-md text-pretty text-ink">
            {turn.body}
          </div>
        ),
      )}
    </div>
  );
}
