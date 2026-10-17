import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Furigana } from "./Furigana";

interface Stage {
  id: string;
  label: MessageDescriptor;
  dot: string;
  /** The reading waits for the turn, keeping its room. */
  waits: boolean;
  turned: boolean;
  caption: MessageDescriptor;
}

const STAGES: Stage[] = [
  {
    id: "new",
    label: msg`New`,
    dot: "bg-state-new",
    waits: false,
    turned: false,
    caption: msg`While you learn a word, its reading sits over the kanji.`,
  },
  {
    id: "known",
    label: msg`Known`,
    dot: "bg-state-known",
    waits: true,
    turned: false,
    caption: msg`Once you know it, you read the kanji yourself.`,
  },
  {
    id: "turned",
    label: msg`Known, turned over`,
    dot: "bg-state-known",
    waits: false,
    turned: true,
    caption: msg`Turn the card over and the reading comes back with the answer.`,
  },
];

/** The same card at three moments, side by side, so the rule reads without pressing anything. */
export function ReadingStages() {
  const { i18n } = useLingui();
  return (
    <ol className="grid gap-5 @3xl:grid-cols-3">
      {STAGES.map((stage) => (
        <li key={stage.id} className="grid content-start gap-3">
          <div className="flex min-h-[220px] flex-col rounded-2xl bg-plate p-5 edge">
            <p className="flex items-center justify-between gap-2 text-xs font-medium tracking-[0.06em] text-muted uppercase">
              <span>
                <span lang="ja">日本語</span> · <Trans>verb</Trans>
              </span>
              <span className="inline-flex items-center gap-1.5 tracking-normal normal-case">
                <span aria-hidden="true" className={clsx("size-1.5 rounded-full", stage.dot)} />
                {i18n._(stage.label)}
              </span>
            </p>
            <p lang="ja" className="mt-5 text-5xl leading-[1.3] font-medium text-text">
              <Furigana term="食べる" reading="たべる" lang="ja" hidden={stage.waits} />
            </p>
            {stage.turned && (
              <p className="mt-auto border-t border-edge-2 pt-3 text-xl font-medium text-text">
                <Trans>To eat</Trans>
              </p>
            )}
          </div>
          <p className="text-md text-pretty text-text-2">{i18n._(stage.caption)}</p>
        </li>
      ))}
    </ol>
  );
}
