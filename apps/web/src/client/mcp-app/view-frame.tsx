import type { ReactNode } from "react";
import { Wordmark } from "../components/logo";

interface Props {
  title: string;
  /** One quiet action on the title row, such as opening the deck in Lymi. */
  action?: ReactNode | undefined;
  children: ReactNode;
}

/**
 * The view's one heading, under Lymi's wordmark so the learner knows whose panel it is inside
 * the assistant. The host draws the border; the frame only pads.
 */
export function ViewFrame({ title, action, children }: Props) {
  return (
    <main className="@container flex flex-col gap-3 p-4">
      <header className="flex flex-col gap-2">
        <Wordmark size={16} className="text-muted" />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h1 className="text-md font-semibold text-balance text-text">{title}</h1>
          {action}
        </div>
      </header>
      {children}
    </main>
  );
}
