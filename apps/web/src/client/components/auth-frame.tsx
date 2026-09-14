import { useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Lantern } from "./lantern";
import { Wordmark } from "./logo";
import { PublicPolicyLinks } from "./public-policy-links";

interface Props {
  children: ReactNode;
  footer?: ReactNode | undefined;
  homeHref?: string | undefined;
}

/** The shared, signed-out frame. One centered brand moment, then one focused task. */
export function AuthFrame({ children, footer, homeHref = "/" }: Props) {
  const { t } = useLingui();
  return (
    <div className="@container min-h-dvh flex-1 bg-canvas text-text">
      <main className="mx-auto flex min-h-dvh w-full flex-col items-center justify-start px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] @xl:px-8 [@media(min-height:720px)]:pt-[calc(0.5rem+env(safe-area-inset-top))] [@media(min-height:720px)]:pb-[calc(0.5rem+env(safe-area-inset-bottom))] [@media(min-height:840px)]:pt-[calc(2rem+env(safe-area-inset-top))] [@media(min-height:840px)]:pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <a
          href={homeHref}
          aria-label={t`Lymi home`}
          className="mx-auto flex w-fit flex-col items-center rounded-sm px-4 py-2 text-text"
        >
          <Lantern
            className="size-24 [@media(min-height:720px)]:size-18 [@media(min-height:840px)]:size-28"
            flicker
          />
          {/* The lantern already carries the flame, so the wordmark stays plain. */}
          <Wordmark size={30} className="mt-3" />
        </a>

        <div className="mx-auto mt-8 grid w-full max-w-[500px] [@media(min-height:720px)]:mt-3">
          {children}
          {footer && (
            <div className="mx-auto flex w-full max-w-[500px] justify-center">{footer}</div>
          )}
          <PublicPolicyLinks className="mt-6" />
        </div>
      </main>
    </div>
  );
}
