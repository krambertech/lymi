import { Plural, Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, SpellCheck, X } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
  type AnswerPart,
  bareWord,
  differing,
  type MarkedAnswer,
  onlyOrderDiffers,
  otherAnswers,
  type Slip,
} from "../../lib/learn/answers";
import { PlayButton } from "./Sound";

const key = (part: AnswerPart, i: number) =>
  `${i}-${part.kind === "missing" ? part.right : part.typed}`;

function Marked({
  text,
  as: Tag,
  className,
}: {
  text: string;
  as: "s" | "span";
  className: string;
}) {
  const word = bareWord(text);
  const from = text.indexOf(word);
  return (
    <>
      {text.slice(0, from)}
      <Tag className={className}>{word}</Tag>
      {text.slice(from + word.length)}
    </>
  );
}

function TypedWord({ part }: { part: AnswerPart }) {
  switch (part.kind) {
    case "same":
      return <span>{part.typed}</span>;
    case "slip":
      return (
        <Marked
          text={part.typed}
          as="span"
          className="underline decoration-dotted decoration-2 underline-offset-4"
        />
      );
    case "changed":
    case "extra":
      return <Marked text={part.typed} as="s" className="text-danger decoration-2" />;
    case "missing":
      return (
        <span
          aria-hidden="true"
          className="inline-block w-7 border-b-2 border-dashed border-danger align-baseline"
        />
      );
  }
}

export function TypedSentence({ marked }: { marked: MarkedAnswer }) {
  const mark =
    marked.verdict === "right" ? "right" : marked.verdict === "almost" ? "slip" : "wrong";
  return (
    <div
      lang="et"
      data-mark={mark}
      className="learn-answer w-full min-w-0 rounded-tile border px-4 py-3 text-xl font-medium break-words"
    >
      {marked.parts.map((part, i) => (
        <Fragment key={key(part, i)}>
          {i > 0 && " "}
          {marked.verdict === "right" && part.kind === "same" ? (
            <span>{part.right}</span>
          ) : (
            <TypedWord part={part} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

export function RightSentence({ marked, src }: { marked: MarkedAnswer; src?: string | undefined }) {
  return (
    <div className="grid gap-1">
      <p className="text-sm text-ink-muted">
        {marked.verdict === "almost" ? (
          <Trans>It’s spelled like this</Trans>
        ) : (
          <Trans>The right sentence</Trans>
        )}
      </p>
      <div className="flex items-center gap-3">
        <p lang="et" className="min-w-0 text-xl font-medium break-words">
          {marked.parts
            .filter((part) => part.kind !== "extra")
            .map((part, i) => (
              <Fragment key={key(part, i)}>
                {i > 0 && " "}
                {part.kind === "same" ? (
                  part.right
                ) : (
                  <Marked
                    text={part.right}
                    as="span"
                    className="font-semibold text-success underline decoration-2 underline-offset-4"
                  />
                )}
              </Fragment>
            ))}
        </p>
        {src && <PlaySentence src={src} sentence={marked.accepted} />}
      </div>
    </div>
  );
}

export function PlaySentence({ src, sentence }: { src: string; sentence: string }) {
  return (
    <PlayButton
      src={src}
      label={
        <Trans>
          Play <span lang="et">{sentence}</span>
        </Trans>
      }
    />
  );
}

export function slipText(slips: readonly Slip[]): ReactNode {
  const [first] = slips;
  const alike = slips.every((slip) => slip === first);
  if (alike && first === "marks")
    return <Trans>Nearly right: only the letters with marks are off.</Trans>;
  if (alike && first === "double") return <Trans>Nearly right: a letter should be double.</Trans>;
  if (alike && first === "single") return <Trans>Nearly right: a letter should be single.</Trans>;
  return <Trans>Nearly right: two letters are off.</Trans>;
}

export function VerdictLine({
  tone,
  children,
}: {
  tone: "right" | "slip" | "wrong";
  children: ReactNode;
}) {
  const Icon = tone === "right" ? Check : tone === "slip" ? SpellCheck : X;
  return (
    <p
      className={clsx(
        "flex items-start gap-2 font-medium",
        tone === "wrong" ? "text-danger" : "text-success",
      )}
    >
      <Icon
        aria-hidden="true"
        className="mt-1 size-4 shrink-0"
        strokeWidth={tone === "slip" ? 2.25 : 2.5}
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function slipsOf(marked: MarkedAnswer): Slip[] {
  return marked.parts.flatMap((part) => (part.kind === "slip" ? [part.slip] : []));
}

export function SentenceVerdict({ marked }: { marked: MarkedAnswer }) {
  const off = differing(marked).length;
  switch (marked.verdict) {
    case "right":
      return (
        <VerdictLine tone="right">
          <Trans>Right.</Trans>
        </VerdictLine>
      );
    case "almost":
      return <VerdictLine tone="slip">{slipText(slipsOf(marked))}</VerdictLine>;
    case "wrong":
      return (
        <VerdictLine tone="wrong">
          {onlyOrderDiffers(marked) ? (
            <Trans>The words are right, but they go in another order.</Trans>
          ) : (
            <Plural
              value={off}
              one="Not right: # word differs."
              other="Not right: # words differ."
            />
          )}
        </VerdictLine>
      );
  }
}

export function OtherForm({ marked }: { marked: MarkedAnswer }) {
  const part = marked.parts.find((each) => each.kind === "changed" && each.mistaken === "form");
  if (part?.kind !== "changed") return null;
  const typed = bareWord(part.typed).toLowerCase();
  const right = bareWord(part.right).toLowerCase();
  return (
    <p className="text-md text-ink-secondary">
      <Trans>
        Estonian has both <b lang="et">{typed}</b> and <b lang="et">{right}</b>, and they don’t mean
        the same.
      </Trans>
    </p>
  );
}

export function AlsoRight({
  marked,
  accepted,
  src,
}: {
  marked: MarkedAnswer;
  accepted: readonly string[];
  src?: string | undefined;
}) {
  const others = otherAnswers(marked, accepted);
  if (others.length === 0) return null;
  return (
    <div className="grid gap-1">
      <p className="text-sm text-ink-muted">
        <Trans>Also right:</Trans>
      </p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {others.map((other) => (
          <li key={other} className="flex items-center gap-3 text-md font-medium">
            <span lang="et">{other}</span>
            {src && other === accepted[0] && <PlaySentence src={src} sentence={other} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpokenDifferences({ marked }: { marked: MarkedAnswer }) {
  return (
    <>
      {differing(marked).map((part, i) => (
        <p key={key(part, i)}>
          <SpokenDifference part={part} />
        </p>
      ))}
    </>
  );
}

function SpokenDifference({ part }: { part: AnswerPart }) {
  switch (part.kind) {
    case "same":
      return null;
    case "slip":
    case "changed": {
      const typed = bareWord(part.typed);
      const right = bareWord(part.right);
      return (
        <Trans>
          You wrote <span lang="et">{typed}</span>. It’s <span lang="et">{right}</span>.
        </Trans>
      );
    }
    case "missing": {
      const right = bareWord(part.right);
      return (
        <Trans>
          Missing: <span lang="et">{right}</span>.
        </Trans>
      );
    }
    case "extra": {
      const typed = bareWord(part.typed);
      return (
        <Trans>
          Not needed here: <span lang="et">{typed}</span>.
        </Trans>
      );
    }
  }
}
