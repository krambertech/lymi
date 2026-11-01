import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { AuthFrame } from "../components/auth-frame";
import { Button } from "../components/button";
import { InlineError } from "../components/inline-error";
import { api } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";

export function UnsubscribeView({ token }: { token: string }) {
  const stop = useMutation({ mutationFn: () => api.unsubscribe(token) });
  useDocumentTitle("Lymi");
  return (
    <AuthFrame homeHref={publicSiteUrl()}>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 text-center @xl:p-10">
        <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink">
          {stop.isSuccess ? (
            <Trans>Learning emails are off</Trans>
          ) : (
            <Trans>Turn off learning emails?</Trans>
          )}
        </h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-md text-ink-secondary">
          {stop.isSuccess ? (
            <Trans>You can turn them back on in Settings.</Trans>
          ) : (
            <Trans>You’ll still get emails about your account.</Trans>
          )}
        </p>
        {!stop.isSuccess && (
          <Button
            className="mt-6 w-full"
            variant="primary"
            loading={stop.isPending}
            onClick={() => stop.mutate()}
          >
            <Trans>Turn off</Trans>
          </Button>
        )}
        {stop.isError && (
          <InlineError className="mt-3">
            <Trans>Couldn’t turn them off. Check your connection and try again.</Trans>
          </InlineError>
        )}
      </section>
    </AuthFrame>
  );
}
