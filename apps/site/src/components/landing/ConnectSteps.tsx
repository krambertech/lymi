import { Trans, useLingui } from "@lingui/react/macro";
import { Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { PRODUCT_ORIGIN } from "../../lib/origins";
import { Lantern } from "../Lantern";
import { AssistantMarks } from "./AssistantMarks";
import { SectionTitle } from "./FeatureSection";

const MCP_URL = `${PRODUCT_ORIGIN}/mcp`;

function CopyAddress() {
  const { t } = useLingui();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const reset = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(reset);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
    } catch {
      // Without clipboard access the address is still there to select by hand.
    }
  };

  return (
    <div className="flex h-12 min-w-0 items-center gap-2 rounded-md bg-plate ps-4 pe-1.5 edge">
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-text select-all">
        {MCP_URL}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t`Copied` : t`Copy the address`}
        className="grid size-9 shrink-0 place-items-center rounded-sm text-text-2 transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.94] hoverable:hover:bg-hover hoverable:hover:text-text"
      >
        {copied ? (
          <Check aria-hidden="true" className="enter-fade size-4 text-good" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}

interface Step {
  id: string;
  title: ReactNode;
  body: ReactNode;
  after: ReactNode;
}

/** What step three looks like in Lymi: the one question it asks. */
function AllowPreview() {
  return (
    <div
      aria-hidden="true"
      className="flex h-12 items-center gap-3 rounded-md bg-canvas ps-1.5 pe-1.5 edge"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-plate edge">
        <Lantern className="size-6" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text">
        <Trans>Let Claude add cards?</Trans>
      </span>
      <span className="flex h-9 items-center rounded-sm bg-amber px-3.5 text-sm font-medium text-amber-ink">
        <Trans>Allow</Trans>
      </span>
    </div>
  );
}

/** The three things a learner does once, in order, before the first ask. */
export function ConnectSteps() {
  const steps: Step[] = [
    {
      id: "copy",
      title: <Trans>Copy Lymi’s address</Trans>,
      body: <Trans>The same address works everywhere. Nothing to install.</Trans>,
      after: <CopyAddress />,
    },
    {
      id: "add",
      title: <Trans>Add it to your assistant</Trans>,
      body: <Trans>Pick your assistant for its steps.</Trans>,
      after: <AssistantMarks compact />,
    },
    {
      id: "allow",
      title: <Trans>Say yes in Lymi</Trans>,
      body: <Trans>Sign in and let it add cards. Then send it your notes.</Trans>,
      after: <AllowPreview />,
    },
  ];

  return (
    <section
      id="connect"
      aria-labelledby="connect-title"
      className="scroll-mt-8 border-b border-edge bg-plate-2 px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <div id="connect-title">
          <SectionTitle>
            <Trans>Connect in three steps.</Trans>
          </SectionTitle>
        </div>
        {/* Rows are shared across the columns, so the three visuals sit on one line however the copy wraps. */}
        <ol className="mt-10 grid gap-4 @3xl:grid-cols-3 @3xl:grid-rows-[auto_1fr_auto] @3xl:gap-x-4 @3xl:gap-y-0">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="grid min-w-0 gap-3 rounded-2xl bg-plate p-5 edge @3xl:row-span-3 @3xl:grid-rows-subgrid @3xl:gap-0"
            >
              <h3 className="flex items-center gap-3 text-lg font-medium tracking-[-0.02em] text-text">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-plate-2 text-sm text-text-2 tabular-nums"
                >
                  {i + 1}
                </span>
                {step.title}
              </h3>
              <p className="text-md text-pretty text-text-2 @3xl:mt-2">{step.body}</p>
              <div className="mt-3 [&_a]:size-10 [&_ul]:justify-start [&_ul]:gap-1.5 @3xl:mt-6">
                {step.after}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
