import type { AppLanguage } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ApiKeysSection } from "../components/ApiKeysSection";
import { ConnectedAppsSection } from "../components/ConnectedAppsSection";
import { NotificationsSection } from "../components/NotificationsSection";
import { api, type Settings } from "../lib/api";
import { signOut } from "../lib/auth";
import { activate, pickLocale } from "../lib/i18n";
import { publicSiteUrl } from "../lib/origins";
import { decksQuery, meQuery, settingsQuery } from "../lib/queries";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { YouView } from "../views/YouView";

export const Route = createFileRoute("/you")({
  component: You,
});

function You() {
  const me = useQuery(meQuery);
  const decks = useQuery(decksQuery);
  const settings = useQuery(settingsQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());
  const [busy, setBusy] = useState(false);
  const total = decks.data?.reduce((n, d) => n + d.total, 0);
  const language = useMutation({
    mutationFn: ({ appLanguage }: { appLanguage: AppLanguage }) =>
      api.updateSettings({ appLanguage }),
    onMutate: async ({ appLanguage }) => {
      await queryClient.cancelQueries({ queryKey: settingsQuery.queryKey });
      const previous = queryClient.getQueryData<Settings>(settingsQuery.queryKey);
      if (previous) {
        queryClient.setQueryData<Settings>(settingsQuery.queryKey, {
          ...previous,
          appLanguage,
          meaningLanguage: appLanguage,
        });
      }
      activate(appLanguage);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(settingsQuery.queryKey, context.previous);
      activate(context?.previous?.appLanguage ?? pickLocale());
    },
    onSuccess: (value) => queryClient.setQueryData(settingsQuery.queryKey, value),
  });
  return (
    <YouView
      me={me.data}
      total={total}
      theme={theme}
      appLanguage={settings.data?.appLanguage ?? pickLocale()}
      onAppLanguage={
        settings.isSuccess ? (appLanguage) => language.mutate({ appLanguage }) : undefined
      }
      languageBusy={language.isPending}
      languageError={language.isError}
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
        navigate({ to: "/login" });
      }}
    >
      <NotificationsSection />
      <ConnectedAppsSection />
      <ApiKeysSection />
    </YouView>
  );
}
