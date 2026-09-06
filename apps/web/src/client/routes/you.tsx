import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ApiKeysSection } from "../components/ApiKeysSection";
import { ConnectedAppsSection } from "../components/ConnectedAppsSection";
import { signOut } from "../lib/auth";
import { decksQuery, meQuery } from "../lib/queries";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { YouView } from "../views/YouView";

export const Route = createFileRoute("/you")({
  component: You,
});

function You() {
  const me = useQuery(meQuery);
  const decks = useQuery(decksQuery);
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());
  const [busy, setBusy] = useState(false);
  const total = decks.data?.reduce((n, d) => n + d.total, 0);
  return (
    <YouView
      me={me.data}
      total={total}
      theme={theme}
      onTheme={(t) => {
        setTheme(t);
        setThemeState(t);
      }}
      signingOut={busy}
      onSignOut={async () => {
        setBusy(true);
        try {
          await signOut();
        } finally {
          setBusy(false);
        }
        navigate({ to: "/login" });
      }}
    >
      <ConnectedAppsSection />
      <ApiKeysSection />
    </YouView>
  );
}
