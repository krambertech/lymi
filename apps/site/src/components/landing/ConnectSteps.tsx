import { Trans, useLingui } from "@lingui/react/macro";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { PRODUCT_ORIGIN } from "../../lib/origins";
import { Lantern } from "../Lantern";
import { AssistantMarks } from "./AssistantMarks";
import { Section } from "./Section";
import { type Step, Steps } from "./Steps";

const MCP_URL = `${PRODUCT_ORIGIN}/mcp`;

export function CopyAddress() {
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
      <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink select-all">
        {MCP_URL}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t`Copied` : t`Copy the address`}
        className="grid size-9 shrink-0 place-items-center rounded-sm text-ink-secondary transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] hoverable:hover:bg-plate-hover hoverable:hover:text-ink"
      >
        {copied ? (
          <Check aria-hidden="true" className="enter-fade size-4 text-success" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
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
      <span className="min-w-0 flex-1 truncate text-sm text-ink">
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
      after: (
        <div className="[&_a]:size-10 [&_ul]:justify-start [&_ul]:gap-1.5">
          <AssistantMarks compact />
        </div>
      ),
    },
    {
      id: "allow",
      title: <Trans>Say yes in Lymi</Trans>,
      body: <Trans>Sign in and let it add cards. Then send it your notes.</Trans>,
      after: <AllowPreview />,
    },
  ];

  return (
    <Section id="connect" surface="nested">
      <Section.Header>
        <Section.Title>
          <Trans>Connect in three steps.</Trans>
        </Section.Title>
      </Section.Header>
      <div className="mt-10">
        <Steps steps={steps} />
      </div>
    </Section>
  );
}
