import { Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Kbd } from "../components/Kbd";
import { Segmented } from "../components/Segmented";
import { SettingsGroup } from "../components/SettingsGroup";
import { Skeleton } from "../components/Skeleton";
import type { Me } from "../lib/api";
import type { ThemeChoice } from "../lib/theme";
import { Page, PageHeader, type StaticNav } from "./Shell";

export interface YouProps {
  me: Me | undefined;
  /** Cards in the decks, for the line under the name. */
  total?: number | undefined;
  /** Cards an integration wrote that have not been looked over. */
  unseen?: number | undefined;
  archivedCount?: number | undefined;
  theme: ThemeChoice;
  onTheme: (t: ThemeChoice) => void;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  /** Extra groups after Keyboard, e.g. API keys. */
  children?: ReactNode | undefined;
  static?: StaticNav;
}

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const SHORTCUTS: [string, string][] = [
  ["N", "Add a word"],
  ["R", "Start review"],
  ["/", "Search"],
  ["Space", "Show the meaning, then Good"],
  ["1 – 4", "Forgot, Hard, Good, Easy"],
  ["Esc", "Leave review or close a sheet"],
];

/**
 * The learner, and everything they open rarely: what integrations wrote, what is archived,
 * and every setting. One screen, because three screens nobody visits daily should not each
 * hold a slot in the navigation. Reached from the avatar on the phone and the sidebar's
 * profile row on desktop.
 */
export function YouView({
  me,
  total,
  unseen,
  archivedCount,
  theme,
  onTheme,
  onSignOut,
  signingOut,
  children,
  static: st,
}: YouProps) {
  const Row = ({
    to,
    label,
    value,
    dot,
  }: {
    to: "/activity" | "/archived";
    label: string;
    value?: string | undefined;
    dot?: boolean | undefined;
  }) => {
    const inner = (
      <>
        <span className="flex-1 text-md">{label}</span>
        {dot && <i className="size-1.5 rounded-full bg-amber-text" aria-hidden="true" />}
        {value && <span className="text-sm tabular-nums text-muted">{value}</span>}
        <ChevronRight className="size-[18px] shrink-0 text-faint" aria-hidden="true" />
      </>
    );
    const cls =
      "flex h-13 items-center gap-3 px-4 text-text transition-[background-color,scale] duration-150 active:scale-[0.99] hoverable:hover:bg-hover";
    return st ? (
      <a href={to} onClick={(e) => e.preventDefault()} className={cls}>
        {inner}
      </a>
    ) : (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  };

  return (
    <Page width="md">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {me ? (
              <Avatar name={me.name} size={44} />
            ) : (
              <Skeleton className="size-11 rounded-full" />
            )}
            <span className="grid gap-1">
              {me ? (
                <>
                  <span>{me.name}</span>
                  <span className="text-sm font-normal tabular-nums text-muted">
                    {[me.email, total ? `${total} cards` : null].filter(Boolean).join(" · ")}
                  </span>
                </>
              ) : (
                <Skeleton className="h-6 w-40" />
              )}
            </span>
          </span>
        }
      />

      <section className="grid gap-2 pb-1" aria-label="Oversight">
        <h2 className="px-1 text-xs font-medium uppercase tracking-[0.06em] text-muted">
          Oversight
        </h2>
        <div className="edge grid divide-y divide-edge overflow-hidden rounded-lg bg-plate">
          <Row
            to="/activity"
            label="Activity"
            value={unseen ? `${unseen} new` : undefined}
            dot={!!unseen}
          />
          <Row to="/archived" label="Archived" value={String(archivedCount ?? 0)} />
        </div>
      </section>

      <SettingsGroup title="Appearance">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="grid gap-0.5">
            <span className="text-base font-medium">Theme</span>
            <span className="text-sm text-muted">
              System follows your device. Dark is a warm room.
            </span>
          </span>
          <Segmented value={theme} onChange={onTheme} options={THEMES} label="Theme" />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Keyboard">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
          {SHORTCUTS.map(([k, what]) => (
            <div key={k} className="contents">
              <dt>
                <Kbd className="h-6 px-2 text-xs">{k}</Kbd>
              </dt>
              <dd className="text-text-2">{what}</dd>
            </div>
          ))}
        </dl>
      </SettingsGroup>

      {children}

      <SettingsGroup title="Account">
        <div>
          <Button size="sm" onClick={onSignOut} loading={signingOut} aria-disabled={!onSignOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </SettingsGroup>
    </Page>
  );
}
