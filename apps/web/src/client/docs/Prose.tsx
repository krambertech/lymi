import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ArrowRight, Hash, Info, TriangleAlert } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";
import type { DocPath } from "./nav";

/** Plain text inside a node, so a heading can make its own anchor. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function Anchor({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="doc-anchor doc-plain ml-2 inline-block align-middle text-faint hoverable:hover:text-text"
    >
      <Hash className="size-3.5" aria-hidden="true" />
    </a>
  );
}

/** A section heading that links to itself. The TOC finds these in the DOM. */
export function H2({ children, id }: { children: ReactNode; id?: string }) {
  const anchor = id ?? slug(textOf(children));
  return (
    <h2 id={anchor}>
      {children}
      <Anchor id={anchor} />
    </h2>
  );
}

export function H3({ children, id }: { children: ReactNode; id?: string }) {
  const anchor = id ?? slug(textOf(children));
  return (
    <h3 id={anchor}>
      {children}
      <Anchor id={anchor} />
    </h3>
  );
}

/** The one sentence under the page title. Larger than body, in full ink. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="mb-8 max-w-[62ch] text-lg text-text-2">{children}</p>;
}

/**
 * An aside the reader should not miss. A well in the page, not a stripe down the side.
 * `careful` is for the two places where getting it wrong costs something.
 */
export function Note({
  tone = "note",
  title,
  children,
}: {
  tone?: "note" | "careful";
  title?: string;
  children: ReactNode;
}) {
  const Icon = tone === "careful" ? TriangleAlert : Info;
  return (
    <aside
      className={clsx(
        "my-5 flex gap-3 rounded-md p-3.5 text-base",
        tone === "careful" ? "bg-danger-soft" : "bg-plate-2",
      )}
    >
      <Icon
        className={clsx(
          "mt-0.5 size-4 shrink-0",
          tone === "careful" ? "text-danger" : "text-muted",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 [&>:last-child]:mb-0 [&>p]:mb-2">
        {title && <p className="font-medium text-text">{title}</p>}
        {children}
      </div>
    </aside>
  );
}

/** An ordered walk-through. The numbers are the structure, so they are real list markers. */
export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <ol className="my-6 grid list-none gap-6 !pl-0">
      {items.map((child, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the steps are a fixed, ordered list
        <li key={i} className="relative grid grid-cols-[26px_1fr] gap-x-3.5">
          <span
            aria-hidden="true"
            className="z-10 grid size-[26px] place-items-center rounded-full bg-plate-2 text-2xs font-semibold text-text tabular-nums edge"
          >
            {i + 1}
          </span>
          {i < items.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute left-[13px] top-[30px] h-[calc(100%+1.1rem)] w-px bg-edge-2"
            />
          )}
          <div className="min-w-0 pt-[3px] [&>:first-child]:mt-0 [&>:last-child]:mb-0">{child}</div>
        </li>
      ))}
    </ol>
  );
}

/** The heading of one step. Sits on the same line as its number. */
export function StepTitle({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 font-medium text-text">{children}</p>;
}

/** A row of terms and their meanings. Reads better than a two-column table on a phone. */
export function Defs({ items }: { items: { term: ReactNode; def: ReactNode }[] }) {
  return (
    <dl className="my-5 grid gap-0 rounded-md bg-plate edge">
      {items.map((it, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a static list
          key={i}
          className="grid gap-1 border-edge px-3.5 py-3 sm:grid-cols-[minmax(9rem,auto)_1fr] sm:gap-4 [&:not(:first-child)]:border-t"
        >
          <dt className="font-medium text-text">{it.term}</dt>
          <dd className="text-base text-text-2">{it.def}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Links onward. A list with hairlines, not a grid of boxes. */
export function NextLinks({ items }: { items: { to: DocPath; title: string; blurb: string }[] }) {
  return (
    <ul className="my-6 grid list-none !pl-0">
      {items.map((it) => (
        <li key={it.to} className="border-t border-edge last:border-b">
          <Link
            to={it.to}
            className="doc-plain group flex items-center gap-4 py-3.5 transition-colors duration-150 hoverable:hover:bg-plate-2 -mx-3 px-3 rounded-sm"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-text">{it.title}</span>
              <span className="block text-base text-muted">{it.blurb}</span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-text"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
