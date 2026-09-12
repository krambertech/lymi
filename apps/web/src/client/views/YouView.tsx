import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { AppLanguage } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Button, buttonClass } from "../components/Button";
import { Select } from "../components/Field";
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
  appLanguage: AppLanguage;
  onAppLanguage?: ((language: AppLanguage) => void) | undefined;
  languageBusy?: boolean | undefined;
  languageError?: boolean | undefined;
  onSignOut?: (() => void | Promise<void>) | undefined;
  websiteUrl?: string | undefined;
  signingOut?: boolean | undefined;
  /** Extra groups after Keyboard, e.g. API keys. */
  children?: ReactNode | undefined;
  static?: StaticNav;
}

const THEMES: { value: ThemeChoice; label: MessageDescriptor }[] = [
  { value: "system", label: msg`System` },
  { value: "light", label: msg`Light` },
  { value: "dark", label: msg`Dark` },
];

export const SHORTCUTS: [string, MessageDescriptor][] = [
  ["N", msg`Add a word`],
  ["R", msg`Start review`],
  ["/", msg`Search`],
  ["Space", msg`Show the meaning, then Good`],
  ["1 – 4", msg`Forgot, Hard, Good, Easy`],
  ["Esc", msg`Leave review or close a sheet`],
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
  appLanguage,
  onAppLanguage,
  languageBusy,
  languageError,
  onSignOut,
  websiteUrl,
  signingOut,
  children,
  static: st,
}: YouProps) {
  const { t, i18n } = useLingui();
  const Row = ({
    to,
    label,
    value,
    dot,
  }: {
    to: "/activity" | "/archived" | "/insights";
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
                    {[
                      me.email,
                      total ? t`${plural(total, { one: "# card", other: "# cards" })}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </>
              ) : (
                <Skeleton className="h-6 w-40" />
              )}
            </span>
          </span>
        }
      />

      <section className="grid gap-2 pb-1" aria-label={t`Oversight`}>
        <h2 className="px-1 text-xs font-medium uppercase tracking-[0.06em] text-muted">
          <Trans>Oversight</Trans>
        </h2>
        <div className="edge grid divide-y divide-edge overflow-hidden rounded-lg bg-plate">
          <Row
            to="/activity"
            label={t`Activity`}
            value={unseen ? t`${plural(unseen, { one: "# new", other: "# new" })}` : undefined}
            dot={!!unseen}
          />
          <Row to="/archived" label={t`Archived`} value={String(archivedCount ?? 0)} />
          {/* The rail carries Insights on desktop; the pill stays two items wide, so the
              phone reaches it here beside the other screens You holds. */}
          <Row to="/insights" label={t`Insights`} />
        </div>
      </section>

      <SettingsGroup title={t`Appearance`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="grid gap-0.5">
            <span className="text-base font-medium">
              <Trans>Theme</Trans>
            </span>
            <span className="text-sm text-muted">
              <Trans>System follows your device. Dark is a warm room.</Trans>
            </span>
          </span>
          <Segmented
            value={theme}
            onChange={onTheme}
            options={THEMES.map((o) => ({ value: o.value, label: i18n._(o.label) }))}
            label={t`Theme`}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title={t`Language`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="grid max-w-[42ch] gap-0.5">
            <span className="text-base font-medium">
              <Trans>App language</Trans>
            </span>
            <span className="text-sm text-muted">
              <Trans>Meanings and reminders use it too.</Trans>
            </span>
          </span>
          <Select
            aria-label={t`App language`}
            value={appLanguage}
            disabled={languageBusy || !onAppLanguage}
            onChange={(event) => onAppLanguage?.(event.target.value as AppLanguage)}
            className="w-40"
          >
            <option value="en">English</option>
            <option value="uk">Українська</option>
            <option value="ru">Русский</option>
          </Select>
        </div>
        {languageError && (
          <p className="text-sm text-danger" role="alert">
            <Trans>Couldn’t save the language. Check your connection and try again.</Trans>
          </p>
        )}
      </SettingsGroup>

      <SettingsGroup title={t`Keyboard`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
          {SHORTCUTS.map(([k, what]) => (
            <div key={k} className="contents">
              <dt>
                <Kbd className="h-6 px-2 text-xs">{k}</Kbd>
              </dt>
              <dd className="text-text-2">{i18n._(what)}</dd>
            </div>
          ))}
        </dl>
      </SettingsGroup>

      {children}

      <SettingsGroup title={t`Account`}>
        <div className="flex flex-wrap gap-2">
          {websiteUrl && (
            <a href={websiteUrl} className={buttonClass("secondary", "sm")}>
              <ExternalLink aria-hidden="true" />
              <Trans>Lymi website</Trans>
            </a>
          )}
          <Button size="sm" onClick={onSignOut} loading={signingOut} aria-disabled={!onSignOut}>
            <LogOut aria-hidden="true" />
            <Trans>Sign out</Trans>
          </Button>
        </div>
      </SettingsGroup>
    </Page>
  );
}
