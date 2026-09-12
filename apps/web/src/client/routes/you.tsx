import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ApiKeysSection } from "../components/ApiKeysSection";
import { ConnectedAppsSection } from "../components/ConnectedAppsSection";
import { NotificationsSection } from "../components/NotificationsSection";
import { signOut } from "../lib/auth";
import { publicSiteUrl } from "../lib/origins";
import { clearPersistedLearnerState } from "../lib/persisted";
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
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());
  const [busy, setBusy] = useState(false);
  const total = decks.data?.reduce((n, d) => n + d.total, 0);
  return (
    <YouView
      me={me.data}
      total={total}
      theme={theme}
      websiteUrl={publicSiteUrl()}
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
        // Whoever signs in next must not inherit this learner's cache or queued grades.
        queryClient.clear();
        clearPersistedLearnerState();
        navigate({ to: "/login" });
      }}
    >
      <NotificationsSection />
      <ConnectedAppsSection />
      <ApiKeysSection />
    </YouView>
  );
}
