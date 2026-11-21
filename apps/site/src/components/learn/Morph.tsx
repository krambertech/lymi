import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { morph } from "../../lib/learn/forms";
import { playSound, usePlaying } from "../../lib/learn/player";
import { Chips } from "./Explore";
import { PlayButton } from "./Sound";

export interface MorphStep {
  /** The form, as written and said: poe. */
  word: string;
  /** What the form is, in the reader's language, under its key: genitive, in the shop. */
  label: string;
  src: string;
  /** What changed on the way to this form, said once its key is pressed. */
  note?: ReactNode;
}

export interface MorphChain {
  id: string;
  /** The base form first, then each form it turns into. */
  steps: readonly MorphStep[];
}

interface MorphProps {
  /** What the choice of words is, for a screen reader: “Words”. */
  label: string;
  chains: readonly MorphChain[];
}

/**
 * A word turning into its forms, on the stage's tray. Pressing a form plays it and turns the word
 * before it into this one: the letters it drops are struck, the ones it gains are lit and
 * underlined, the rest stay put. With reduced motion the change shows at once.
 */
export function Morph({ label, chains }: MorphProps) {
  const [chainId, setChainId] = useState(chains[0]?.id ?? "");
  const chain = chains.find((each) => each.id === chainId) ?? chains[0];
  if (!chain) return null;
  return (
    <div className="grid gap-5">
      {chains.length > 1 && (
        <Chips
          label={label}
          items={chains.map((each) => ({
            label: each.steps[0]?.word,
            value: each.id,
            lang: "et",
          }))}
          value={chain.id}
          onPick={(value) => {
            setChainId(value);
            // A word opens on its first change, so that form is the one heard.
            const steps = chains.find((each) => each.id === value)?.steps ?? [];
            const shown = steps[Math.min(1, steps.length - 1)];
            if (shown) void playSound(shown.src);
          }}
        />
      )}
      <MorphChainView key={chain.id} chain={chain} />
    </div>
  );
}

function MorphChainView({ chain }: { chain: MorphChain }) {
  const { i18n } = useLingui();
  // The chain opens on its first change, so the word shows what it does before any press.
  const [at, setAt] = useState(Math.min(1, chain.steps.length - 1));
  // Counts presses: the change plays on each one, never as the page opens.
  const [turn, setTurn] = useState(0);
  const step = chain.steps[at];
  const before = chain.steps[at - 1];
  if (!step) return null;
  const parts = before
    ? morph(before.word, step.word)
    : [{ text: step.word, kind: "kept" as const }];
  return (
    <div className="grid gap-5">
      <div aria-live="polite" className="grid gap-1.5">
        <div className="flex min-h-16 items-center gap-3">
          <p
            // Every press replays the change, the same key's too.
            key={turn}
            data-play={turn > 0 ? "" : undefined}
            lang="et"
            className="learn-morph min-w-0 text-5xl/tight font-semibold tracking-tight wrap-anywhere max-sm:text-4xl/tight"
          >
            {/* The sentence is in the reader's language; only the forms in it are Estonian. */}
            <span lang={before ? i18n.locale : undefined} className="sr-only">
              {before ? (
                <Trans>
                  <span lang="et">{before.word}</span> becomes <span lang="et">{step.word}</span>
                </Trans>
              ) : (
                step.word
              )}
            </span>
            <span aria-hidden="true">
              {parts.map((part, i) =>
                part.kind === "added" ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a word's parts never reorder
                  <span key={i} data-kind="added">
                    <span>{part.text}</span>
                  </span>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a word's parts never reorder
                  <span key={i} data-kind={part.kind}>
                    {part.text}
                  </span>
                ),
              )}
            </span>
          </p>
          <PlayButton
            src={step.src}
            label={
              <Trans>
                Play <span lang="et">{step.word}</span>
              </Trans>
            }
            className="ms-1"
          />
        </div>
        <p className="min-h-6 text-md text-ink-secondary">{step.note ?? step.label}</p>
      </div>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-2 p-0">
        {chain.steps.map((each, i) => (
          <Fragment key={each.word}>
            {i > 0 && (
              <li aria-hidden="true" className="text-ink-muted">
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </li>
            )}
            <li>
              <StepKey
                step={each}
                pressed={i === at}
                onPress={() => {
                  setAt(i);
                  setTurn((n) => n + 1);
                  void playSound(each.src);
                }}
              />
            </li>
          </Fragment>
        ))}
      </ol>
    </div>
  );
}

function StepKey({
  step,
  pressed,
  onPress,
}: {
  step: MorphStep;
  pressed: boolean;
  onPress: () => void;
}) {
  const playing = usePlaying(step.src);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-playing={playing ? "" : undefined}
      onClick={onPress}
      className={clsx(
        "learn-key grid cursor-pointer justify-items-start rounded-tile bg-plate px-3 pt-1.5 pb-2 text-start hoverable:hover:bg-plate-hover",
      )}
    >
      <b lang="et" className="text-xl font-semibold tracking-tight">
        {step.word}
      </b>
      <small className="text-xs text-ink-muted">{step.label}</small>
    </button>
  );
}
