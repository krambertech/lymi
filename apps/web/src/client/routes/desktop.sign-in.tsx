import { electronProxyClient } from "@better-auth/electron/proxy";
import { useLingui } from "@lingui/react/macro";
import { isolate } from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { cookiePrefix } from "../../shared/cookies";
import { DESKTOP_APP_SCHEME } from "../../shared/origins";
import { AuthFrame } from "../components/auth-frame";
import { Button } from "../components/button";
import { ApiError } from "../lib/api";
import { signInWithApple, signInWithGoogle, signOut } from "../lib/auth";
import { useDocumentTitle } from "../lib/document-title";
import { meQuery } from "../lib/queries";

/** The hand-off's own client, so only this page carries the Electron plugin. */
const handOffClient = () =>
  createAuthClient({
    basePath: "/api/auth",
    plugins: [
      electronProxyClient({
        protocol: { scheme: DESKTOP_APP_SCHEME },
        cookiePrefix: cookiePrefix(window.location.origin),
      }),
    ],
  });

const Search = z.object({
  client_id: z.string().optional(),
  code_challenge: z.string().optional(),
  state: z.string().optional(),
  /** Set when the learner chose Apple or Google in the app, so a signed-out browser goes straight there. */
  provider: z.enum(["apple", "google"]).optional(),
});

export const Route = createFileRoute("/desktop/sign-in")({
  validateSearch: Search,
  component: DesktopSignIn,
});

/**
 * Where the system browser hands a signed-in learner to the Mac app, which opened it with a PKCE
 * challenge. Signing in happens on the ordinary login page, which returns here; the learner then
 * confirms which account the app gets, so a link alone never signs an app in.
 */
function DesktopSignIn() {
  const { t } = useLingui();
  useDocumentTitle(t`Sign in to Lymi for Mac`);
  const navigate = useNavigate();
  const search = Route.useSearch();
  const me = useQuery(meQuery);
  const [state, setState] = useState<"idle" | "busy" | "handed" | "failed">("idle");
  const complete = !!(search.client_id && search.code_challenge && search.state);
  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  // Back here without the provider, so a sign-in that returns never starts another.
  const here = `${window.location.pathname}?${new URLSearchParams({
    client_id: search.client_id ?? "",
    code_challenge: search.code_challenge ?? "",
    state: search.state ?? "",
  })}`;
  const provider = search.provider;
  const leaving = useRef(false);

  useEffect(() => {
    if (!complete || !signedOut || leaving.current) return;
    leaving.current = true;
    const toLogin = () => navigate({ to: "/login", search: { returnTo: here } });
    if (!provider) return void toLogin();
    // A provider that cannot start, such as one not set up locally, leaves the ordinary login.
    (provider === "apple" ? signInWithApple : signInWithGoogle)(here)
      .then((res) => res.error && toLogin())
      .catch(toLogin);
  }, [complete, signedOut, provider, navigate, here]);

  async function hand() {
    if (!search.client_id || !search.code_challenge || !search.state) return;
    if (state === "busy" || !me.isSuccess) return;
    const handed = state === "handed";
    setState("busy");
    const query = {
      client_id: search.client_id,
      code_challenge: search.code_challenge,
      state: search.state,
    };
    const client = handOffClient();
    const res = await client.electron.transferUser({ fetchOptions: { query } }).catch(() => null);
    if (!res?.data?.electron_authorization_code) {
      setState(handed ? "handed" : "failed");
      return;
    }
    setState("handed");
    client.ensureElectronRedirect();
  }

  async function switchAccount() {
    await signOut();
    navigate({ to: "/login", search: { returnTo: here } });
  }

  const email = me.data?.email ?? "";
  return (
    <AuthFrame>
      <section className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-medium">{t`Sign in to Lymi for Mac`}</h1>
        {!complete ? (
          <p className="text-ink-secondary">{t`Open this page from Lymi for Mac to sign in there.`}</p>
        ) : state === "handed" ? (
          <>
            <p className="text-ink-secondary" role="status">
              {t`Lymi for Mac opens and signs you in. You can close this tab once it has.`}
            </p>
            <Button variant="ghost" size="sm" onClick={() => void hand()}>
              {t`Open Lymi for Mac again`}
            </Button>
          </>
        ) : (
          <>
            <p className="text-ink-secondary">
              {me.isSuccess
                ? t`Continue as ${{ email: isolate(email) }}`
                : t`Checking your account…`}
            </p>
            {/* Any app can claim the link scheme, so only the learner's own click is the proof. */}
            <p className="text-sm text-ink-muted">
              {t`Only continue if you just chose Sign in in Lymi for Mac.`}
            </p>
            {state === "failed" && (
              <p className="text-danger" role="alert">
                {t`This sign-in link has expired. Start again from Lymi for Mac.`}
              </p>
            )}
            <div className="mt-2 flex flex-col items-center gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => void hand()}
                aria-disabled={state === "busy" || !me.isSuccess}
              >
                {t`Open Lymi for Mac`}
              </Button>
              {me.isSuccess && (
                <Button variant="ghost" size="sm" onClick={() => void switchAccount()}>
                  {t`Use another account`}
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </AuthFrame>
  );
}
