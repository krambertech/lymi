import { Dialog } from "@base-ui/react/dialog";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useCommandList } from "../components/ui/command-palette";
import { Input } from "../components/ui/input";
import { isFindKey } from "./device-frame";
import { type DocRef, FOUNDATIONS, GROUPS, groupListing } from "./registry";

type Section = "Start" | "Foundations" | "Components";

interface Row {
  key: string;
  title: string;
  detail: string;
  section: Section;
  to: DocRef;
  hash?: string | undefined;
}

const SECTIONS: Section[] = ["Start", "Foundations", "Components"];

const ROWS: Row[] = [
  {
    key: "home",
    title: "Overview",
    detail: "What this is and where things live.",
    section: "Start",
    to: { kind: "home" },
  },
  ...FOUNDATIONS.map(
    (f): Row => ({
      key: `page/${f.slug}`,
      title: f.title,
      detail: f.summary,
      section: "Foundations",
      to: { kind: "page", page: f.slug },
    }),
  ),
  ...GROUPS.map(
    (g): Row => ({
      key: `group/${g.slug}`,
      title: g.title,
      detail: groupListing(g.slug).summary,
      section: "Components",
      to: { kind: "group", group: g.slug },
    }),
  ),
  ...GROUPS.flatMap((g) =>
    g.entries.map(
      (e): Row => ({
        key: `${g.slug}/${e.slug}`,
        title: e.name,
        detail: g.title,
        section: "Components",
        to: { kind: "group", group: g.slug },
        hash: e.slug,
      }),
    ),
  ),
];

// Specimens hold some overlays open, so only one with focus in it counts as in use.
const OVERLAY = '[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]';

/** ⌘K, or Ctrl K, finds any page or component and goes there. */
export function usePageSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isFindKey(e)) return;
      if (!open && document.activeElement?.closest(OVERLAY)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return { open, setOpen };
}

export function PageSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Titles first, so "chip" lands on Chip before every summary that mentions chips.
  const byTitle = ROWS.filter((r) => r.title.toLowerCase().includes(q));
  const byDetail =
    q.length < 3
      ? []
      : ROWS.filter((r) => !byTitle.includes(r) && r.detail.toLowerCase().includes(q));
  const matches = q ? [...byTitle, ...byDetail] : ROWS.filter((r) => !r.hash);
  // The section of the best match goes first, so Enter takes it.
  const order = q ? [...new Set(matches.map((r) => r.section))] : SECTIONS;
  const sections = order.map((section) => ({
    section,
    rows: matches.filter((r) => r.section === section),
  }));
  // The keys walk the rows in the order they are drawn, section by section.
  const rows = sections.flatMap((s) => s.rows);

  const go = (row: Row) => {
    onOpenChange(false);
    const hash = row.hash;
    // The router sees no change for the hash it is already on, so it would not scroll.
    if (hash && window.location.hash === `#${hash}`)
      document.getElementById(hash)?.scrollIntoView();
    switch (row.to.kind) {
      case "home":
        return navigate({ to: "/design" });
      case "page":
        return navigate({ to: "/design/$page", params: { page: row.to.page } });
      case "group":
        return navigate({
          to: "/design/components/$group",
          params: { group: row.to.group },
          ...(hash ? { hash } : {}),
        });
    }
  };

  const list = useCommandList({ items: rows, onRun: go });
  const { reset } = list;
  useEffect(() => {
    if (!open) setQuery("");
    reset();
  }, [open, reset]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--z-backdrop) bg-scrim" />
        <Dialog.Popup
          aria-label="Find a page"
          className="glass fixed inset-x-0 top-[10vh] z-(--z-sheet) mx-auto grid max-h-[min(80dvh,46rem)] w-[min(calc(100vw-24px),60rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl text-ink outline-none"
        >
          <div className="relative border-b border-edge p-3">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-6 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <Input
              aria-label="Find a page"
              placeholder="Find a page"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                reset();
              }}
              className="ps-10"
              {...list.inputProps}
            />
          </div>
          <div {...list.listProps} className="@container overflow-y-auto overscroll-contain p-3">
            {rows.length === 0 ? (
              <p className="px-3 py-8 text-center text-base text-ink-muted">
                No page matches “{query.trim()}”.
              </p>
            ) : (
              <div
                className={
                  q
                    ? "grid gap-y-5"
                    : "grid gap-x-4 gap-y-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
                }
              >
                {sections.map(({ section, rows: inSection }) => (
                  // biome-ignore lint/a11y/useSemanticElements: options grouped inside a listbox; a fieldset groups form controls.
                  <div
                    key={section}
                    role="group"
                    aria-label={section}
                    className={section === "Start" && !q ? "@3xl:col-span-2" : undefined}
                  >
                    <h2 className="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-ink-muted">
                      {section}
                    </h2>
                    <div className={section === "Components" ? "grid @xl:grid-cols-2" : "grid"}>
                      {inSection.map((row) => (
                        <div
                          key={row.key}
                          {...list.optionProps(rows.indexOf(row))}
                          className="grid min-w-0 cursor-default gap-0.5 rounded-md px-2.5 py-2 transition-colors duration-150 select-none data-active:bg-plate-hover"
                        >
                          <span className="text-sm font-medium text-ink">{row.title}</span>
                          <span className="truncate text-xs text-ink-muted">{row.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
