import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signOut } from "../lib/auth";
import { meQuery } from "../lib/queries";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { SettingsView } from "../views/SettingsView";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const me = useQuery(meQuery);
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());
  const [busy, setBusy] = useState(false);
  return (
    <SettingsView
      me={me.data}
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
    />
  );
}
