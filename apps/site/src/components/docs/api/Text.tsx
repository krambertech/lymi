import { clsx } from "clsx";
import { type ReactNode, useState } from "react";

/** The inline Markdown route descriptions use: `code` and **bold**, nothing else. */
export function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      // biome-ignore lint/suspicious/noArrayIndexKey: parts of one fixed string
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      // biome-ignore lint/suspicious/noArrayIndexKey: parts of one fixed string
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/** Past this many characters a description opens on its first lines, so the route stays in view. */
const LONG = 360;

export function Description({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  return (
    <div className={className}>
      <p className={clsx("!mb-0 text-base text-text-2", long && !open && "line-clamp-3")}>
        {inline(text)}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-1 rounded-xs text-sm font-medium text-text hoverable:hover:underline"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
