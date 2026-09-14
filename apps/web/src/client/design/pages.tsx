import { Navigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { DocLink } from "./doc-link";
import { Doc, DocSource, Sub } from "./frame";
import { FOUNDATIONS, GROUPS, ORDER, SCREENS } from "./registry";

function useDocTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · Lymi design`;
  }, [title]);
}

export function FoundationPage({ slug }: { slug: string }) {
  const page = FOUNDATIONS.find((f) => f.slug === slug);
  useDocTitle(page?.title);
  if (!page) {
    const firstGroup = GROUPS[0]?.slug ?? "actions";
    const firstScreen = SCREENS[0]?.slug ?? "today";
    if (slug === "components")
      return <Navigate to="/design/components/$group" params={{ group: firstGroup }} replace />;
    if (slug === "screens")
      return <Navigate to="/design/screens/$screen" params={{ screen: firstScreen }} replace />;
    return <Navigate to="/design/$page" params={{ page: "brand" }} replace />;
  }
  return (
    <DocSource.Provider value={page.source}>
      <page.Page />
      <DocFooter current={`page:${page.slug}`} />
    </DocSource.Provider>
  );
}

export function GroupPage({ slug }: { slug: string }) {
  const group = GROUPS.find((g) => g.slug === slug);
  useDocTitle(group?.title);
  if (!group) return <Navigate to="/design/$page" params={{ page: "components" }} replace />;
  const single = group.entries.length === 1;
  return (
    // A group of one takes its component's edit link in the page header.
    <DocSource.Provider value={single ? group.entries[0]?.source : undefined}>
      <Doc title={group.title} lede={group.lede} crumb="Components">
        {group.entries.map((e) => (
          <Sub
            key={e.slug}
            title={single ? undefined : e.name}
            note={single ? undefined : e.note}
            source={single ? undefined : e.source}
          >
            <e.Demo />
          </Sub>
        ))}
      </Doc>
      <DocFooter current={`group:${group.slug}`} />
    </DocSource.Provider>
  );
}

export function ScreenPage({ slug }: { slug: string }) {
  const screen = SCREENS.find((s) => s.slug === slug);
  useDocTitle(screen?.name);
  if (!screen) return <Navigate to="/design/$page" params={{ page: "screens" }} replace />;
  return (
    <DocSource.Provider value={screen.source}>
      <Doc title={screen.name} lede={screen.note} crumb="Screens">
        <Sub>
          <screen.Demo />
        </Sub>
      </Doc>
      <DocFooter current={`screen:${screen.slug}`} />
    </DocSource.Provider>
  );
}

function DocFooter({ current }: { current: string }) {
  const at = ORDER.findIndex((d) => d.key === current);
  const prev = at > 0 ? ORDER[at - 1] : undefined;
  const next = at >= 0 ? ORDER[at + 1] : undefined;
  const step =
    "group edge flex min-w-0 items-center gap-3 rounded-md bg-plate px-4 py-3 transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover";
  const arrow =
    "size-4 shrink-0 text-muted transition-[translate,color] duration-150 ease-out rtl:-scale-x-100 hoverable:group-hover:text-text motion-reduce:transition-none";
  return (
    <nav
      aria-label="Previous and next"
      className="mt-16 grid gap-3 border-t border-edge pt-8 @xl:grid-cols-2"
    >
      {prev ? (
        <DocLink to={prev.ref} className={step}>
          <ArrowLeft
            aria-hidden="true"
            className={`${arrow} hoverable:group-hover:-translate-x-0.5 rtl:hoverable:group-hover:translate-x-0.5`}
          />
          <span className="grid min-w-0 gap-0.5">
            <span className="text-xs text-muted">Previous</span>
            <span className="truncate text-base">{prev.title}</span>
          </span>
        </DocLink>
      ) : (
        <span />
      )}
      {next && (
        <DocLink to={next.ref} className={`${step} justify-end text-end`}>
          <span className="grid min-w-0 gap-0.5">
            <span className="text-xs text-muted">Next</span>
            <span className="truncate text-base">{next.title}</span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className={`${arrow} hoverable:group-hover:translate-x-0.5 rtl:hoverable:group-hover:-translate-x-0.5`}
          />
        </DocLink>
      )}
    </nav>
  );
}
