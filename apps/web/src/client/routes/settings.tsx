import { useLingui } from "@lingui/react/macro";
import type { AppLanguage } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AccountSection } from "../components/account-section";
import { ApiKeysSection } from "../components/api-keys-section";
import { ConnectedAppsSection } from "../components/connected-apps-section";
import { ExportSheet } from "../components/export-sheet";
import { NotificationsSection } from "../components/notifications-section";
import { api, type Settings } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { activate, pickLocale } from "../lib/i18n";
import { meQuery, settingsQuery } from "../lib/queries";
import { getTheme, setTheme, type ThemeChoice } from "../lib/theme";
import { SettingsView } from "../views/settings-view";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Settings`);
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
  const [exporting, setExporting] = useState(false);
  return (
    <SettingsView
      me={me.data}
      // Null means never chosen: the browser pick that is already active.
      language={settings.isSuccess ? (settings.data.appLanguage ?? pickLocale()) : undefined}
      onLanguage={language.mutate}
      languageError={language.isError}
      account={<AccountSection name={me.data?.name} email={me.data?.email} />}
      onExportLibrary={() => setExporting(true)}
      importLink={(source, className, children) => (
        <Link to={`/import/${source}`} className={className}>
          {children}
        </Link>
      )}
      theme={theme}
      onTheme={(t) => {
        setTheme(t);
        setThemeState(t);
      }}
    >
      <NotificationsSection />
      <ConnectedAppsSection />
      <ApiKeysSection />
      <ExportSheet open={exporting} onOpenChange={setExporting} scope={{ kind: "library" }} />
    </SettingsView>
  );
}
