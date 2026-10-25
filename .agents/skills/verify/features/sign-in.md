# Sign in

`/login` offers Apple, Google and email in both sign-in and account-creation mode; password reset keeps only the email form. A provider failure shows above the provider buttons, leaves them usable for a retry, and keeps the destination.

## Reach

Signed out, `/login?returnTo=%2Flibrary`.

## Drive

[`sign-in.mjs`](sign-in.mjs), as `learner`: sign out through the API, open `/login?returnTo=%2Flibrary`, check **Continue with Apple**, **Continue with Google** and **Email**, then press **Continue with Apple**.

## End state

The three choices show with no session. After the press the alert says **Sign-in didn’t finish. Try again.**, **Continue with Apple** stays enabled, the URL keeps `returnTo=%2Flibrary`, and `/api/auth/get-session` still returns null.

## Gotchas

- The local Apple provider is unavailable and the recipe sends synthetic credentials, so it proves the control and the recovery state, not Apple authentication. `apple-sign-in.test.ts` drives the native token verifier and the web callback, including account linking, nonce rejection, forged state, attribution and destination preservation; `e2e/apple-sign-in.spec.ts` covers the local error in all three languages and both browser projects.
- A real Apple round trip needs the registered HTTPS domain and the deployed configuration: verify first sign-in, Hide My Email, repeat sign-in, cancellation, the intended destination, and the same account on web and iPhone. Keep that evidence apart from the recipe's, and never use a real account for automated persona evidence.
