import type { ReactNode } from "react";

/** A titled group of settings. One per concern, separated by a rule. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 py-5 [&+&]:border-t [&+&]:border-edge">
      <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">{title}</h2>
      {children}
    </section>
  );
}
