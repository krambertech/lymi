import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ApiKeysSection } from "../components/ApiKeysSection";
import { Button } from "../components/Button";
import { signOut } from "../lib/auth";
import { meQuery } from "../lib/queries";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function Settings() {
  const me = useQuery(meQuery);
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 md:max-w-2xl md:px-8 md:pb-8">
      <header className="pt-4 pb-4 md:pt-8">
        <h1 className="text-[22px] font-semibold">Settings</h1>
      </header>

      <section className="grid gap-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-muted">Appearance</h2>
        <fieldset className="inline-flex w-fit gap-0.5 rounded-md border border-border bg-bg p-[3px]">
          <legend className="sr-only">Theme</legend>
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTheme(t.value);
                setThemeState(t.value);
              }}
              className={
                theme === t.value
                  ? "h-7 rounded-[10px] bg-surface px-3 text-[13px] font-medium text-ink shadow-[0_1px_2px_oklch(0_0_0/0.12)]"
                  : "h-7 rounded-[10px] px-3 text-[13px] font-medium text-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </fieldset>
      </section>

      <section className="mt-3 grid gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-muted">Account</h2>
        {me.data && (
          <p className="text-[14.5px]">
            <span className="font-medium">{me.data.name}</span>
            <span className="ml-2 text-muted">{me.data.email}</span>
          </p>
        )}
        <Button
          size="sm"
          className="w-fit"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        >
          Sign out
        </Button>
      </section>

      <ApiKeysSection />

      <p className="mt-6 text-[12.5px] text-muted">
        Keyboard: N adds a word, R starts review, Space reveals, 1 to 4 grade.
      </p>
    </div>
  );
}
