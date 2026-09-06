import { clsx } from "clsx";
import {
  Activity,
  BookMarked,
  ChartNoAxesColumn,
  type LucideIcon,
  Search,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { Avatar } from "../components/Avatar";
import { Kbd } from "../components/Kbd";
import { Wordmark } from "../components/Logo";
import { NavLink, type StaticNav } from "../components/NavLink";

export type { StaticNav } from "../components/NavLink";

export interface NavDeck {
  id: string;
  name: string;
  total: number;
  due: number;
}

/**
 * Desktop navigation, in reading order. Insights ships later; it holds its slot so the list
 * does not reorder when it lands.
 */
export const NAV: {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  later?: boolean;
}[] = [
  { to: "/", label: "Today", icon: Sun, exact: true },
  { to: "/library", label: "Library", icon: BookMarked },
  { to: "/insights", label: "Insights", icon: ChartNoAxesColumn, later: true },
  { to: "/activity", label: "Activity", icon: Activity },
];

interface SidebarProps {
  decks: NavDeck[] | undefined;
  name: string | undefined;
  onAdd: () => void;
  onCreateDeck?: (() => void) | undefined;
  onSearch?: (() => void) | undefined;
  /** Something an integration wrote is unseen. A dot, never a count. */
  unseen?: boolean | undefined;
  static?: StaticNav;
  className?: string | undefined;
}

/**
 * Desktop navigation. Sits on the canvas; only the active item gets a plate. The wordmark
 * and the add menu share the top row, and the learner sits at the bottom where Settings lives.
 */
export function Sidebar({
  decks,
  name,
  onAdd,
  onCreateDeck,
  onSearch,
  unseen,
  static: st,
  className,
}: SidebarProps) {
  const item =
    "group flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-base text-text-2 transition-[background-color,color,box-shadow] duration-150 hoverable:hover:bg-plate-2 hoverable:hover:text-text [&.active]:bg-plate [&.active]:text-text [&.active]:edge [&_svg]:size-[18px] [&_svg]:text-muted [&.active_svg]:text-text";
  return (
    <aside className={clsx("flex w-60 shrink-0 flex-col gap-0.5 px-3 pb-4 pt-safe", className)}>
      <div className="mb-3 flex h-14 items-center justify-between gap-2 px-2">
        <Wordmark size={17} className="text-text" title="Lymi" />
        <AddMenu onAddCard={onAdd} onCreateDeck={onCreateDeck} size="sm" align="start" />
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="edge mb-3 flex h-9 items-center gap-2 rounded-md bg-plate px-3 text-base text-muted transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left">Search</span>
        <Kbd>/</Kbd>
      </button>

      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} exact={n.exact} className={item} st={st}>
          <n.icon aria-hidden="true" />
          <span className="flex-1">{n.label}</span>
          {n.later && <span className="text-xs text-faint">later</span>}
          {n.to === "/activity" && unseen && (
            <i className="size-1.5 rounded-full bg-amber-text" aria-hidden="true" />
          )}
        </NavLink>
      ))}

      {decks && decks.length > 0 && (
        <>
          <div className="mx-2.5 mb-1 mt-5 text-xs font-medium text-muted">Decks</div>
          {decks.map((d) => (
            <NavLink
              key={d.id}
              to="/library/$deckId"
              params={{ deckId: d.id }}
              className={item}
              st={st}
            >
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-xs tabular-nums text-muted">
                {d.due > 0 ? <b className="font-semibold text-amber-text">{d.due}</b> : d.total}
              </span>
            </NavLink>
          ))}
        </>
      )}

      <div className="flex-1" />

      <NavLink to="/you" className={clsx(item, "h-12 px-2")} st={st}>
        <Avatar name={name} size={28} />
        <span className="flex-1 truncate text-text">{name ?? "You"}</span>
      </NavLink>
    </aside>
  );
}

/**
 * The app frame. The shell is capped and centred rather than stretched: a vocabulary app has
 * one column of content, and a 2560 px sidebar-plus-column is a worse read, not a better one.
 */
export function AppShell({
  sidebar,
  nav,
  children,
}: {
  sidebar?: ReactNode | undefined;
  /** The phone pill. Floats over the content, centred above the home indicator. */
  nav?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <div className="@container flex min-h-dvh w-full justify-center">
      <div className="flex w-full max-w-(--shell) flex-1">
        {sidebar}
        <main className="@container flex min-w-0 flex-1 flex-col pt-safe">{children}</main>
      </div>
      {nav && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-sticky) flex justify-center pb-safe @3xl:hidden">
          <div className="mb-6">{nav}</div>
        </div>
      )}
    </div>
  );
}

/** Page column. Same on every screen so the eye lands in the same place. */
export function Page({
  children,
  width = "full",
  className,
}: {
  children: ReactNode;
  /** "md" for reading screens, "full" for Today, Library and a deck. */
  width?: "md" | "full" | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={clsx(
        "mx-auto flex w-full flex-1 flex-col px-5 pb-safe-nav @3xl:px-8 @3xl:pb-10",
        width === "md" && "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  sub,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  /** Small line above the title, e.g. a back link on the phone. */
  eyebrow?: ReactNode | undefined;
  /** One line under the title: the date, a count. */
  sub?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header className={clsx("grid gap-1 pb-4 pt-2 @3xl:pt-0", className)}>
      {eyebrow}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h1 className="text-2xl font-medium leading-none text-text">{title}</h1>
          {sub && <p className="text-sm text-muted tabular-nums">{sub}</p>}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
