import { clsx } from "clsx";
import { useEffect, useState } from "react";

/**
 * What to call a heading in the contents. A heading built from parts (an HTTP method and a
 * path, say) declares its own label with `data-toc`; anything else uses its text without
 * the anchor link that sits inside it.
 */
function labelOf(node: HTMLHeadingElement): string {
  const declared = node.dataset.toc;
  if (declared) return declared;
  const copy = node.cloneNode(true) as HTMLElement;
  for (const anchor of copy.querySelectorAll(".doc-anchor")) anchor.remove();
  return (copy.textContent ?? "").trim();
}

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * The contents of the page being read. Headings are found in the DOM rather than declared
 * twice, so a page and its contents can never drift apart. The API reference fills itself in
 * after a fetch, so the list is rebuilt whenever the page's content changes.
 */
export function Toc({ path }: { path: string }) {
  const [items, setItems] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigating is what re-reads the DOM
  useEffect(() => {
    // <main> outlives a route change; the page inside it does not. Watching the container
    // rather than the page catches both the swap and a page that fills itself in later.
    const main = document.querySelector("main");
    if (!main) return;
    let spy: IntersectionObserver | undefined;

    const read = () => {
      spy?.disconnect();
      const nodes = Array.from(
        main.querySelectorAll<HTMLHeadingElement>(".doc-prose h2[id], .doc-prose h3[id]"),
      );
      setItems(
        nodes.map((n) => ({
          id: n.id,
          text: labelOf(n),
          level: n.tagName === "H3" ? 3 : 2,
        })),
      );
      if (nodes.length === 0) return;

      // The top of the viewport is "where you are reading".
      const seen = new Set<string>();
      spy = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) seen.add(e.target.id);
            else seen.delete(e.target.id);
          }
          const first = nodes.find((n) => seen.has(n.id));
          if (first) setActive(first.id);
        },
        { rootMargin: "-72px 0px -70% 0px" },
      );
      for (const n of nodes) spy.observe(n);
    };

    read();
    const content = new MutationObserver(read);
    content.observe(main, { childList: true, subtree: true });
    return () => {
      content.disconnect();
      spy?.disconnect();
    };
  }, [path]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-2.5 px-2 text-xs font-medium text-muted">On this page</p>
      <ul className="grid list-none">
        {items.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              className={clsx(
                "block rounded-xs py-1.5 pr-2 transition-colors duration-150",
                h.level === 3 ? "pl-5" : "pl-2",
                active === h.id ? "text-text" : "text-muted hoverable:hover:text-text",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
