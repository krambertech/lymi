import type { ReactNode } from "react";

/** A titled group of settings. One per concern, separated by a rule. */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  /** One sentence under the title: what the group governs. */
  description?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 py-6 [&+&]:border-t [&+&]:border-edge">
      <div className="grid gap-1">
        <h2 className="text-md font-medium text-text">{title}</h2>
        {description && <p className="max-w-[60ch] text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
