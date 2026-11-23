import type { MessageDescriptor } from "@lingui/core";
import { Trans as Message, useLingui as useCatalog } from "@lingui/react";
import { useState } from "react";
import { CLIPS, clipId, clipText, clipUrl } from "../../lib/learn/clips";
import {
  type ChoiceDrill,
  type DrillItem,
  type DrillOption,
  type DrillText,
  drawOptions,
  type FormDrill,
  type GapDrill,
} from "../../lib/learn/drill";
import { shuffle } from "../../lib/learn/quiz";
import { FormRound } from "./FormRound";
import { ChoiceRound, GapRound, type RoundProps } from "./Quiz";

type Round<Item> = RoundProps<Item> & { lesson: string };

export function RichText({ text }: { text: MessageDescriptor }) {
  return (
    <Message
      {...text}
      components={{
        et: <span lang="et" className="font-medium text-ink" />,
      }}
    />
  );
}

function FormDrillRound({ item, lesson, ...round }: Round<FormDrill>) {
  const { i18n } = useCatalog();
  const [options] = useState(() =>
    item.wrong
      ? drawOptions<string>({ answer: item.answers[0], wrong: item.wrong }, shuffle)
      : undefined,
  );
  const clip = CLIPS[lesson]?.[clipId(item.say)];
  const said = clip === undefined ? item.say : clipText(clip);
  return (
    <FormRound
      {...round}
      item={{
        base: item.base,
        gloss: i18n._(item.gloss),
        cue: "et" in item.cue ? item.cue.et : i18n._(item.cue),
        cueLang: "et" in item.cue ? "et" : undefined,
        answers: item.answers,
        src: clipUrl(lesson, clipId(item.say)),
        said: (
          <>
            {said}{" "}
            {item.means && (
              <span lang={i18n.locale} className="text-md">
                {i18n._(item.means)}
              </span>
            )}
          </>
        ),
        explain: <RichText text={item.explain} />,
        ...(options ? { options } : {}),
      }}
    />
  );
}

function Label({ text }: { text: DrillText }) {
  const { i18n } = useCatalog();
  return "et" in text ? (
    <span lang="et">{text.et}</span>
  ) : (
    <span lang={i18n.locale} className="text-lg font-medium tracking-normal">
      {i18n._(text)}
    </span>
  );
}

function ChoiceDrillRound({ item, lesson, ...round }: Round<ChoiceDrill>) {
  const { i18n } = useCatalog();
  const [options] = useState(() => drawOptions<DrillOption>(item, shuffle));
  return (
    <ChoiceRound
      {...round}
      item={{
        src: clipUrl(lesson, clipId(item.say)),
        answer: item.answer.id,
        options: options.map(({ id, label, sub }) => ({
          id,
          label: <Label text={label} />,
          sub: sub && i18n._(sub),
        })),
        explain: <RichText text={item.explain} />,
      }}
    />
  );
}

function GapDrillRound({ item, lesson, ...round }: Round<GapDrill>) {
  const [options] = useState(() => drawOptions<string>(item, shuffle));
  return (
    <GapRound
      {...round}
      listen={item.listen}
      item={{
        src: clipUrl(lesson, clipId(item.say)),
        before: item.before,
        after: item.after,
        answer: item.answer,
        options,
        explain: <RichText text={item.explain} />,
      }}
    />
  );
}

export function DrillRound({ item, ...round }: Round<DrillItem>) {
  switch (item.kind) {
    case "form":
      return <FormDrillRound item={item} {...round} />;
    case "choice":
      return <ChoiceDrillRound item={item} {...round} />;
    case "gap":
      return <GapDrillRound item={item} {...round} />;
  }
}
