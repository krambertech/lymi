import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Kbd } from "../components/Kbd";
import { Segmented } from "../components/Segmented";
import type { Me } from "../lib/api";
import type { ThemeChoice } from "../lib/theme";
import { Page, PageHeader } from "./Shell";

export interface SettingsProps {
  me: Me | undefined;
  theme: ThemeChoice;
  onTheme: (t: ThemeChoice) => void;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  /** Extra groups after Account, e.g. API keys. */
  children?: ReactNode | undefined;
}

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const SHORTCUTS: [string, string][] = [
  ["N", "Add a word"],
  ["R", "Start review"],
  ["Space", "Show the meaning, then Good"],
  ["1 – 4", "Again, Hard, Good, Easy"],
  ["Esc", "Leave review or close a sheet"],
];

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 py-5 [&+&]:border-t [&+&]:border-edge">
      <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView({
  me,
  theme,
  onTheme,
  onSignOut,
  signingOut,
  children,
}: SettingsProps) {
  return (
    <Page>
      <PageHeader title="Settings" />
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
      <SettingsGroup title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {me ? (
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-amber-soft text-sm font-semibold text-amber-text">
                {me.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="grid">
                <span className="text-base font-medium">{me.name}</span>
                <span className="text-sm text-muted">{me.email}</span>
              </span>
            </span>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={onSignOut} loading={signingOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </SettingsGroup>
      {children}
    </Page>
  );
}
