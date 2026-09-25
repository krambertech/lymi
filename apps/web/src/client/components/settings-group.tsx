import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

interface Props extends Omit<ComponentProps<"section">, "title"> {
  /** An anchor, so another screen can link straight to this group. */
  id?: string | undefined;
  title: string;
  /** One sentence under the title: what the group governs. */
  description?: ReactNode | undefined;
  children: ReactNode;
}

/** A titled group of settings. One per concern, separated by a rule. */
export function SettingsGroup({ title, description, className, children, ...rest }: Props) {
  return (
    <section
      className={clsx("grid scroll-mt-4 gap-4 py-6 [&+&]:border-t [&+&]:border-edge", className)}
      {...rest}
    >
      <div className="grid gap-1">
        <h2 className="text-md font-medium text-text">{title}</h2>
        {description && <p className="max-w-[60ch] text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
