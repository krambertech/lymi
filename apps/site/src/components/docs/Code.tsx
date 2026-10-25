import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { highlight, type Lang } from "./highlight";

/** Copy to clipboard, then say so for a second and a half. */
function CopyButton({ text, className }: { text: string; className?: string | undefined }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={done ? "Copied" : "Copy code"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard refused (no permission, or an insecure origin). The code is selectable.
        }
      }}
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-xs px-2 text-2xs font-medium text-muted",
        "transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97]",
        "hoverable:hover:bg-plate-2 hoverable:hover:text-text",
        className,
      )}
    >
      {done ? (
        <Check className="size-3.5 text-good" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span className={done ? "text-good" : undefined}>{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

export interface CodeProps {
  code: string;
  lang?: Lang | undefined;
  /** What this snippet is: "Terminal", "Response", a filename. Sits in the header bar. */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * One snippet. A plate with a hairline edge, a header bar when it has a label, and a copy
 * button that is always reachable by keyboard.
 */
export function Code({ code, lang = "bash", label, className }: CodeProps) {
  const body = code.replace(/\n+$/, "");
  return (
    <div className={clsx("group relative my-4 rounded-md bg-plate edge", className)}>
      {label ? (
        <div className="flex h-9 items-center justify-between gap-3 border-b border-edge pl-3.5 pr-1.5">
          <span className="truncate font-mono text-2xs text-muted">{label}</span>
          <CopyButton text={body} />
        </div>
      ) : (
        <div className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <CopyButton text={body} className="bg-plate" />
        </div>
      )}
      <pre className="doc-code doc-scroll px-3.5 py-3">
        <code>{highlight(body, lang)}</code>
      </pre>
    </div>
  );
}

const TAB_KEY = "lymi-docs-lang";

export interface Sample {
  /** Tab label, e.g. "curl". */
  name: string;
  lang: Lang;
  code: string;
}

/**
 * The same request in several languages. The reader's choice is remembered across every
 * block on the site, so picking "Python" once is enough.
 */
export function CodeTabs({ samples, label }: { samples: Sample[]; label?: string | undefined }) {
  const first = samples[0];
  const [name, setName] = useState(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved && samples.some((s) => s.name === saved)) return saved;
    } catch {}
    return first?.name ?? "";
  });
  const active = samples.find((s) => s.name === name) ?? first;
  if (!active) return null;

  return (
    <div className="my-4 rounded-md bg-plate edge">
      <div className="flex h-9 items-center justify-between gap-3 border-b border-edge pl-1.5 pr-1.5">
        <div
          className="doc-scroll flex items-center gap-0.5"
          role="tablist"
          aria-label={label ?? "Language"}
        >
          {samples.map((s) => {
            const on = s.name === active.name;
            return (
              <button
                key={s.name}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setName(s.name);
                  try {
                    localStorage.setItem(TAB_KEY, s.name);
                  } catch {}
                }}
                className={clsx(
                  "h-7 shrink-0 rounded-xs px-2 font-mono text-2xs transition-[background-color,color] duration-150",
                  on ? "bg-plate-2 text-text" : "text-muted hoverable:hover:text-text",
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        <CopyButton text={active.code.replace(/\n+$/, "")} />
      </div>
      <pre className="doc-code doc-scroll px-3.5 py-3">
        <code>{highlight(active.code.replace(/\n+$/, ""), active.lang)}</code>
      </pre>
    </div>
  );
}
