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

/** A pointer's shortcut to a section's link, kept out of the heading's name and the tab order. */
function Anchor({ id }: { id: string }) {
  return (
    <span aria-hidden="true" className="doc-anchor ml-2 inline-block align-middle">
      <a
        href={`#${id}`}
        aria-label="Link to this section"
        tabIndex={-1}
        className="doc-plain text-ink-faint hoverable:hover:text-ink"
      >
        <Hash className="size-3.5" aria-hidden="true" />
      </a>
    </span>
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
  return <p className="mb-8 max-w-[62ch] text-lg text-ink-secondary">{children}</p>;
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
        tone === "careful" ? "bg-danger-soft" : "bg-plate-nested",
      )}
    >
      <Icon
        className={clsx(
          "mt-0.5 size-4 shrink-0",
          tone === "careful" ? "text-danger" : "text-ink-muted",
        )}
        aria-hidden="true"
      />
      {/* Inline code on the well takes the page's plate, so it still reads as a chip. */}
      <div className="min-w-0 [&>:last-child]:mb-0 [&>p]:mb-2 [&_code]:!bg-plate">
        {title && <p className="!mb-1 font-medium text-ink">{title}</p>}
        {children}
      </div>
    </aside>
  );
}

/** An ordered walk-through. The numbers are the structure, so they are real list markers. */
export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <ol className="my-6 grid list-none gap-6 !ps-0">
      {items.map((child, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the steps are a fixed, ordered list
        <li key={i} className="relative grid grid-cols-[26px_1fr] gap-x-3.5">
          <span
            aria-hidden="true"
            className="z-10 grid size-[26px] place-items-center rounded-full bg-plate-nested text-2xs font-semibold text-ink tabular-nums edge"
          >
            {i + 1}
          </span>
          {i < items.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute start-[13px] top-[30px] h-[calc(100%+1.1rem)] w-px bg-edge-strong"
            />
          )}
          <div className="min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">{child}</div>
        </li>
      ))}
    </ol>
  );
}

/** The heading of one step. Its line is as tall as the number beside it, so the two centre. */
export function StepTitle({ children }: { children: ReactNode }) {
  return <p className="!mb-1.5 font-medium leading-[26px] text-ink">{children}</p>;
}

/** Terms and meanings on shared columns, so every meaning starts at the same edge. */
export function Defs({ items }: { items: { term: ReactNode; def: ReactNode }[] }) {
  return (
    <dl className="my-5 grid rounded-md bg-plate edge sm:grid-cols-[fit-content(16rem)_1fr]">
      {items.map((it, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a static list
          key={i}
          className="grid gap-y-1 border-edge px-3.5 py-3 sm:col-span-2 sm:grid-cols-subgrid sm:gap-x-6 [&:not(:first-child)]:border-t"
        >
          <dt className="text-base font-medium text-ink">{it.term}</dt>
          <dd className="text-base text-ink-secondary">{it.def}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Links onward, as rows of one plate, so a hovered row fills inside the lines around it. */
export function NextLinks({ items }: { items: { to: DocPath; title: string; blurb: string }[] }) {
  return (
    <ul className="my-6 grid list-none overflow-hidden rounded-md bg-plate !ps-0 edge">
      {items.map((it) => (
        <li key={it.to} className="border-edge [&:not(:first-child)]:border-t">
          <a
            href={it.to}
            className="doc-plain group flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hoverable:hover:bg-plate-nested"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{it.title}</span>
              <span className="block text-base text-ink-muted">{it.blurb}</span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
              aria-hidden="true"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
