import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { productUrl } from "../lib/origins";
import { localizedPath } from "../lib/routes";
import { AuthFrame } from "./AuthFrame";
import { BetaSignup } from "./BetaSignup";
import { LanguageLinks } from "./LanguageLinks";

export const JOIN_TITLE = msg`Request access · Lymi`;
export const JOIN_BLURB = msg`Request access to the Lymi private beta.`;

/** The access request is its own small sign-up flow, separate from authentication. */
export function JoinView() {
  const { i18n } = useLingui();
  const homeHref = localizedPath("landing", i18n.locale);
  return (
    <AuthFrame homeHref={homeHref} footer={<LanguageLinks page="join" />}>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 @xl:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-text">
            <Trans>Request access</Trans>
          </h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-md text-text-2">
            <Trans>
              Lymi is private for now. Leave your email and we’ll write when a place opens.
            </Trans>
          </p>
        </div>

        <div className="mt-7">
          <BetaSignup source="join" compact layout="stacked" />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Trans>Already invited?</Trans>{" "}
          <a
            href={productUrl("/login")}
            className="rounded-sm font-medium text-text underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:decoration-current"
          >
            <Trans>Sign in</Trans>
          </a>
        </p>
      </section>
    </AuthFrame>
  );
}
