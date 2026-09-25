import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonClass } from "./button";
import { Kbd } from "./kbd";
import { Lantern } from "./lantern";
import { NavLink, useStaticNav } from "./nav-link";

interface StartGuideProps {
  decks: number;
  cards: number;
  /** Whether an assistant is connected; undefined while unknown, so its link does not flash. */
  connected: boolean | undefined;
  connectUrl: string | undefined;
  onAdd: (() => void) | undefined;
  onCreateDeck: (() => void) | undefined;
}

/**
 * Today before the first review: three steps in order, each done by the learner's own data. The
 * current step holds its action; the guide gives way to the usual Today after the first review.
 */
export function StartGuide({
  decks,
  cards,
  connected,
  connectUrl,
  onAdd,
  onCreateDeck,
}: StartGuideProps) {
  const st = useStaticNav();
  const current = decks === 0 ? 0 : cards === 0 ? 1 : 2;
  const link =
    "text-base font-medium text-text-2 underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:text-text hoverable:hover:decoration-text";
  const steps: { key: string; title: ReactNode; body: ReactNode }[] = [
    {
      key: "deck",
      title: <Trans>Make a deck</Trans>,
      body: (
        <>
          <p className="text-md text-text-2">
            <Trans>Make one for each course or topic.</Trans>
          </p>
          <Button
            variant="primary"
            onClick={onCreateDeck}
            aria-disabled={!onCreateDeck}
            className="justify-self-start"
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            <Trans>New deck</Trans>
          </Button>
        </>
      ),
    },
    {
      key: "cards",
      title: <Trans>Add cards from your last lesson</Trans>,
      body: (
        <>
          <Button
            variant="primary"
            onClick={onAdd}
            aria-disabled={!onAdd}
            kbd="N"
            className="justify-self-start"
          >
            <Trans>Add a card</Trans>
          </Button>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {connected === false && connectUrl && (
              <a
                href={connectUrl}
                onClick={st ? (e) => e.preventDefault() : undefined}
                className={link}
              >
                <Trans>Send a lesson from Claude or ChatGPT</Trans>
              </a>
            )}
            <NavLink to="/settings" hash="api-keys" className={link}>
              <Trans>Add cards with the API</Trans>
            </NavLink>
          </div>
        </>
      ),
    },
    {
      key: "review",
      title: <Trans>Review them</Trans>,
      body: (
        <>
          <p className="text-md text-text-2">
            <Trans>Insights fill in from your first review.</Trans>
          </p>
          <NavLink
            to="/review"
            search={{}}
            className={buttonClass("primary", "md", "justify-self-start")}
          >
            <Trans>Review</Trans>
            <span className="hidden @2xl:contents">
              <Kbd tone="on-primary">R</Kbd>
            </span>
          </NavLink>
        </>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="start-guide"
      className="edge grid overflow-hidden rounded-xl bg-plate"
    >
      <div className="grid gap-3 px-5 pt-4 pb-4 @3xl:px-6">
        <div className="flex items-center gap-3">
          <Lantern className="-my-2 -ms-2 size-14" />
          <h2 id="start-guide" className="text-xl font-medium">
            <Trans>Getting started</Trans>
          </h2>
          <span className="ms-auto text-sm text-muted tabular-nums">
            <Trans>{current} of 3 done</Trans>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1" aria-hidden="true">
          {steps.map((step, i) => (
            <i
              key={step.key}
              className={clsx("block h-1 rounded-full", i < current ? "bg-text" : "bg-plate-2")}
            />
          ))}
        </div>
      </div>
      <ol>
        {steps.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "later";
          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-t border-edge px-5 py-4 @3xl:px-6"
            >
              <span
                className={clsx(
                  "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
                  state === "done" && "bg-good text-canvas",
                  state === "current" && "text-text shadow-[inset_0_0_0_1.5px_var(--text)]",
                  state === "later" && "edge-inset text-muted",
                )}
              >
                {state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={clsx(
                  "self-center text-md font-medium",
                  state === "done" && "text-muted line-through decoration-edge-2",
                  state === "later" && "text-muted",
                )}
              >
                {step.title}
                {state === "done" && (
                  <span className="sr-only">
                    {" "}
                    <Trans>Done</Trans>
                  </span>
                )}
              </span>
              {state === "current" && <div className="col-start-2 grid gap-3">{step.body}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
