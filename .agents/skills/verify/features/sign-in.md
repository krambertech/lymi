# Sign in

Open `/login?returnTo=%2Flibrary`. Apple, Google, and email are available in both sign-in and account-creation mode; password reset keeps only the email form. A provider failure shows above the provider buttons, leaves them usable for retry, and preserves the destination.

The local recipe exercises the unavailable Apple provider with synthetic credentials. It proves the control and recovery state, not Apple authentication. `apple-sign-in.test.ts` drives the actual native token verifier and web callback, including account linking, nonce rejection, forged state, attribution, and destination preservation. `e2e/apple-sign-in.spec.ts` covers the local error in all three languages and both browser projects.

A real Apple round trip requires the registered HTTPS domain and deployed configuration. Verify first sign-in, Hide My Email, repeat sign-in, cancellation, the intended destination, and the same account on web and iPhone. Keep that evidence separate from the local recipe; never use a real account for automated persona evidence.
