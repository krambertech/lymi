import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";

interface Props {
  title: ReactNode;
  /** A line under the invitation, for what this page promises that isn't in every account yet. */
  note?: ReactNode;
}

/**
 * The page's one conversion, and the one place the lantern is lit: the page opens with a hand of
 * cards to turn over and closes with the light that keeps them.
 */
export function SignUpSection({ title, note }: Props) {
  return (
    <section id="sign-up" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="signup-plate mx-auto max-w-[1040px] rounded-2xl bg-plate-2 px-7 py-16 text-center edge-inset @2xl:px-12 @4xl:px-16 @4xl:py-24">
        <span className="signup-light">
          <span aria-hidden="true" className="signup-pool" />
          <Lantern glow flicker className="size-full" />
        </span>
        <h2 className="mx-auto mt-8 max-w-[16ch] text-4xl font-medium tracking-[-0.035em] text-balance text-text @2xl:text-5xl @4xl:text-6xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-lg text-pretty text-text-2">
          <Trans>Lymi is free to use, and your first card takes a minute.</Trans>
        </p>
        <div className="mt-9">
          <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
            <Trans>Get started</Trans>
          </a>
        </div>
        {note && <p className="mx-auto mt-9 max-w-[52ch] text-sm text-pretty text-muted">{note}</p>}
      </div>
    </section>
  );
}
