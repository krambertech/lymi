import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Layers, type LucideIcon, Plus, Settings2, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Kbd } from "../components/Kbd";
import { AppTile, Wordmark } from "../components/Logo";

export interface NavDeck {
  id: string;
  name: string;
  total: number;
  due: number;
}

export const NAV: { to: "/" | "/decks" | "/settings"; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Today", icon: Sun },
  { to: "/decks", label: "Decks", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

/** Design page: plain anchors with a forced active path instead of router links. */
export type StaticNav = { path: string } | undefined;

function NavLink({
  to,
  params,
  exact,
  className,
  st,
  children,
}: {
  to: string;
  params?: Record<string, string> | undefined;
  exact?: boolean | undefined;
  className: string;
  st: StaticNav;
  children: ReactNode;
}) {
  if (st) {
    const href = params ? to.replace("$deckId", params.deckId ?? "") : to;
    return (
      <a
        href={href}
        className={clsx(className, st.path === href && "active")}
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={to} params={params ?? {}} activeOptions={{ exact: !!exact }} className={className}>
      {children}
    </Link>
  );
}

interface SidebarProps {
  decks: NavDeck[] | undefined;
  totalDue: number;
  onAdd: () => void;
  static?: StaticNav;
  className?: string | undefined;
}

/** Desktop navigation. Sits on the canvas; only the active item gets a plate. */
export function Sidebar({ decks, totalDue, onAdd, static: st, className }: SidebarProps) {
  const item =
    "group flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-base text-text-2 transition-[background-color,color,box-shadow] duration-150 hoverable:hover:bg-plate-2 hoverable:hover:text-text [&.active]:bg-plate [&.active]:text-text [&.active]:edge [&_svg]:size-[18px] [&_svg]:text-muted [&.active_svg]:text-text";
  return (
    <aside className={clsx("flex w-60 shrink-0 flex-col gap-0.5 px-3 pb-3 pt-safe", className)}>
      <div className="mb-4 flex h-14 items-center gap-2.5 px-2">
        <AppTile size={28} glow={totalDue > 0} title="Lymi" />
        <Wordmark size={17} className="text-text" />
      </div>
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} exact={n.to === "/"} className={item} st={st}>
          <n.icon aria-hidden="true" />
          <span className="flex-1">{n.label}</span>
          {n.to === "/" && totalDue > 0 && (
            <span className="rounded-full bg-amber-soft px-1.5 text-xs font-semibold text-amber-text tabular-nums">
              {totalDue}
            </span>
          )}
        </NavLink>
      ))}
      {decks && decks.length > 0 && (
        <>
          <div className="mx-2.5 mb-1 mt-5 text-xs font-medium text-muted">Decks</div>
          {decks.map((d) => (
            <NavLink
              key={d.id}
              to="/decks/$deckId"
              params={{ deckId: d.id }}
              className={item}
              st={st}
            >
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-xs text-muted tabular-nums">
                {d.due > 0 ? <b className="font-semibold text-amber-text">{d.due}</b> : d.total}
              </span>
            </NavLink>
          ))}
        </>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onAdd}
        className="flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-base text-text-2 transition-[background-color,color,scale] duration-150 hoverable:hover:bg-plate-2 hoverable:hover:text-text active:scale-[0.97] [&_svg]:size-[18px] [&_svg]:text-muted"
      >
        <Plus aria-hidden="true" />
        <span className="flex-1 text-left">Add word</span>
        <Kbd>N</Kbd>
      </button>
    </aside>
  );
}

interface TabBarProps {
  totalDue: number;
  onAdd: () => void;
  static?: StaticNav;
  className?: string | undefined;
}

/** Phone navigation. Three tabs and an amber Add. Hidden during review so the grades own the bottom. */
export function TabBar({ totalDue, onAdd, static: st, className }: TabBarProps) {
  const cls =
    "flex h-14 flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium text-muted transition-colors [&.active]:text-text [&_svg]:size-[22px]";
  return (
    <nav
      className={clsx(
        "flex items-stretch border-t border-edge bg-canvas/95 px-2 backdrop-blur-md pb-safe",
        className,
      )}
      aria-label="Main"
    >
      {NAV.map((n, i) => [
        <NavLink key={n.to} to={n.to} exact={n.to === "/"} className={cls} st={st}>
          <span className="relative">
            <n.icon aria-hidden="true" />
            {n.to === "/" && totalDue > 0 && (
              <span className="absolute -top-2 left-full -ml-1 min-w-[18px] rounded-full bg-amber-soft px-1 text-center text-2xs font-semibold leading-[18px] text-amber-text tabular-nums">
                {totalDue}
              </span>
            )}
          </span>
          <span>{n.label}</span>
        </NavLink>,
        i === 1 ? (
          <button key="add" type="button" onClick={onAdd} className={cls}>
            <Plus aria-hidden="true" />
            <span>Add</span>
          </button>
        ) : null,
      ])}
    </nav>
  );
}

/** Page column. Same on every screen so the eye lands in the same place. */
export function Page({
  children,
  width = "md",
  className,
}: {
  children: ReactNode;
  width?: "md" | "lg" | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={clsx(
        "mx-auto flex w-full flex-1 flex-col px-5 pb-safe-tab @3xl:px-10 @3xl:pb-10",
        width === "md" ? "max-w-2xl" : "max-w-4xl",
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
  actions,
  children,
  className,
}: {
  title: ReactNode;
  /** Small line above the title, e.g. a back link on the phone. */
  eyebrow?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header className={clsx("grid gap-1 pb-4 pt-2 @3xl:pt-0", className)}>
      {eyebrow}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium leading-none text-text">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** A deck row. Name, due count in amber, total, chevron. */
export function DeckRow({
  name,
  language,
  due,
  total,
  href,
  st,
}: {
  name: string;
  language?: string | null | undefined;
  due: number;
  total: number;
  href: string;
  st?: StaticNav;
}) {
  const cls =
    "group edge flex items-center gap-3 rounded-lg bg-plate px-4 py-3.5 transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover";
  const inner = (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-md font-medium">{name}</span>
        {language && (
          <span className="text-xs uppercase tracking-[0.06em] text-muted">{language}</span>
        )}
      </span>
      <span className="flex items-baseline gap-2 text-sm text-muted tabular-nums">
        {due > 0 && <b className="font-semibold text-amber-text">{due} due</b>}
        <span>{total}</span>
      </span>
    </>
  );
  if (st)
    return (
      <a href={href} onClick={(e) => e.preventDefault()} className={cls}>
        {inner}
      </a>
    );
  return (
    <Link to="/decks/$deckId" params={{ deckId: href.split("/").pop() ?? "" }} className={cls}>
      {inner}
    </Link>
  );
}
