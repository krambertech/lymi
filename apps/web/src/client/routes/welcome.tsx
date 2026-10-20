import { createFileRoute, redirect } from "@tanstack/react-router";

// A new account starts on Today now; links to Welcome from before land there. docs/design/onboarding.md.
export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    throw redirect({ to: "/today", replace: true });
  },
});
