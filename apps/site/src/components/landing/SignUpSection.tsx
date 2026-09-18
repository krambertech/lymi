import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";

interface Props {
  title: ReactNode;
  /** A line under the invitation, for what this page promises that isn't in every account yet. */
  note?: ReactNode;
}

/** The page's one conversion: an account, made in a minute, with nothing to pay for. */
export function SignUpSection({ title, note }: Props) {
  return (
    <section id="sign-up" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px] rounded-2xl bg-plate-2 px-7 py-14 text-center edge-inset @2xl:px-12 @4xl:px-16 @4xl:py-20">
        <h2 className="mx-auto max-w-[18ch] text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-md text-pretty text-text-2">
          <Trans>Lymi is in public beta, and it is free while it is there.</Trans>
        </p>
        <div className="mt-8">
          <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
            <Trans>Get started</Trans>
          </a>
        </div>
        {note && <p className="mx-auto mt-8 max-w-[52ch] text-sm text-pretty text-muted">{note}</p>}
      </div>
    </section>
  );
}
