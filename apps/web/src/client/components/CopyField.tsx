import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

/**
 * A secret you have to move somewhere else. Mono, because it is proofread character by
 * character; selectable, because the clipboard is not always allowed; and the button says
 * what happened rather than leaving you to guess whether the tap took.
 */
export function CopyField({
  value,
  label,
  className,
}: {
  value: string;
  /** Names the thing for screen readers, e.g. "API key". */
  label: string;
  className?: string | undefined;
}) {
  const { t } = useLingui();
  const [copied, setCopied] = useState(false);
  const field = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (an insecure origin, or a browser that asks). Select the key
      // instead, so the fallback is one keystroke rather than a careful drag.
      if (field.current) window.getSelection()?.selectAllChildren(field.current);
    }
  }

  return (
    <div className={clsx("flex items-start gap-2", className)}>
      {/* <output> is a live region by default; the panel around it already announces. */}
      <output
        ref={field}
        aria-live="off"
        aria-label={label}
        className="edge min-w-0 flex-1 select-all break-all rounded-sm bg-plate-2 px-3 py-2.5 font-mono text-sm leading-5 text-text"
      >
        {value}
      </output>
      <Button variant={copied ? "secondary" : "primary"} className="shrink-0" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? t`Copied` : t`Copy`}
      </Button>
    </div>
  );
}
