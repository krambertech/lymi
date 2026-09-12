import type { AppLanguage } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ApiKeysSection } from "../components/ApiKeysSection";
import { ConnectedAppsSection } from "../components/ConnectedAppsSection";
import { NotificationsSection } from "../components/NotificationsSection";
import { api, type Settings } from "../lib/api";
import { activate, pickLocale } from "../lib/i18n";
import { meQuery, settingsQuery } from "../lib/queries";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { SettingsView } from "../views/SettingsView";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const me = useQuery(meQuery);
  const settings = useQuery(settingsQuery);
  const qc = useQueryClient();
  const language = useMutation({
    mutationFn: (appLanguage: AppLanguage) => api.updateSettings({ appLanguage }),
    // The interface switches on the tap and rolls back if the server refuses.
    onMutate: async (appLanguage) => {
      await qc.cancelQueries({ queryKey: settingsQuery.queryKey });
      const previous = qc.getQueryData<Settings>(settingsQuery.queryKey);
      if (previous) {
        qc.setQueryData<Settings>(settingsQuery.queryKey, {
          ...previous,
          appLanguage,
          meaningLanguage: appLanguage,
        });
      }
      activate(appLanguage);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) qc.setQueryData(settingsQuery.queryKey, context.previous);
      activate(context?.previous?.appLanguage ?? pickLocale());
    },
    onSuccess: (value) => qc.setQueryData(settingsQuery.queryKey, value),
  });
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme());
  return (
    <SettingsView
      me={me.data}
      // Null means never chosen: the browser pick that is already active.
      language={settings.isSuccess ? (settings.data.appLanguage ?? pickLocale()) : undefined}
      onLanguage={language.mutate}
      languageError={language.isError}
      theme={theme}
      onTheme={(t) => {
        setTheme(t);
        setThemeState(t);
      }}
    >
      <NotificationsSection />
      <ConnectedAppsSection />
      <ApiKeysSection />
    </SettingsView>
  );
}
