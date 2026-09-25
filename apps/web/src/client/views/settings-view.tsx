import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { AppLanguage, ImportSource } from "@lymi/core";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { AccountGroup } from "../components/account-section";
import { Button } from "../components/button";
import { ImportSources } from "../components/import-parts";
import { InlineError } from "../components/inline-error";
import { Screen } from "../components/layout/screen";
import { Segmented } from "../components/segmented";
import { SettingsGroup } from "../components/settings-group";
import { Skeleton } from "../components/skeleton";
import { Field, FieldLabel } from "../components/ui/field";
import { Select, SelectContent, SelectTrigger, SelectValue } from "../components/ui/select";
import type { Me } from "../lib/api";
import type { ThemeChoice } from "../lib/theme";

export interface SettingsProps {
  me: Me | undefined;
  /** Undefined until the settings query lands. */
  language: AppLanguage | undefined;
  onLanguage: (l: AppLanguage) => void;
  languageError?: boolean | undefined;
  theme: ThemeChoice;
  onTheme: (t: ThemeChoice) => void;
  /** The Account group with a working photo. Without it, the group only shows who is signed in. */
  account?: ReactNode | undefined;
  /** The groups that need the network: reminders, connected apps, API keys. */
  children?: ReactNode | undefined;
  /** A link to one app's import page. */
  importLink: (source: ImportSource, className: string, children: ReactNode) => ReactNode;
  /** Opens the sheet that exports the whole library. */
  onExportLibrary?: (() => void) | undefined;
}

/** Each language in its own name, so a learner can find theirs whatever is active. */
const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "ru", label: "Русский" },
];

const THEMES: { value: ThemeChoice; label: MessageDescriptor }[] = [
  { value: "system", label: msg`System` },
  { value: "light", label: msg`Light` },
  { value: "dark", label: msg`Dark` },
];

/**
 * Every setting, and the ways to bring cards in from another app. Where to go and how to leave
 * live in the learner menu.
 */
export function SettingsView({
  me,
  language,
  onLanguage,
  languageError,
  theme,
  onTheme,
  account,
  children,
  importLink,
  onExportLibrary,
}: SettingsProps) {
  const { t, i18n } = useLingui();
  return (
    <Screen title={t`Settings`} width="md" back={{ label: t`Today`, to: "/today" }}>
      {account ?? <AccountGroup name={me?.name} email={me?.email} />}

      <SettingsGroup
        title={t`Language`}
        description={t`App language, and the language AI uses for meanings.`}
      >
        {language ? (
          // The group's title already says Language; the field's label names the picker for
          // assistive technology without printing it twice.
          <Field className="w-56">
            <FieldLabel className="sr-only">{t`Language`}</FieldLabel>
            <Select
              value={language}
              onValueChange={(v) => {
                if (v && v !== language) onLanguage(v as AppLanguage);
              }}
              items={LANGUAGES}
            >
              <SelectTrigger>
                <SelectValue placeholder={t`Choose one`} />
              </SelectTrigger>
              <SelectContent />
            </Select>
          </Field>
        ) : (
          <Skeleton className="h-10 w-56 rounded-md" />
        )}
        {languageError && (
          <p className="text-sm" role="alert">
            <InlineError>
              <Trans>Couldn’t save the language. Check your connection and try again.</Trans>
            </InlineError>
          </p>
        )}
      </SettingsGroup>

      <SettingsGroup title={t`Theme`} description={t`Match your device.`}>
        <Segmented
          value={theme}
          onChange={onTheme}
          options={THEMES.map((o) => ({ value: o.value, label: i18n._(o.label) }))}
          label={t`Theme`}
        />
      </SettingsGroup>

      {children}

      <SettingsGroup
        id="export"
        title={t`Export`}
        description={t`Export all decks (pictures, schedule, review history) as a Lymi file or Anki package.`}
      >
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={onExportLibrary}
          aria-disabled={!onExportLibrary}
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          <Trans>Export library</Trans>
        </Button>
      </SettingsGroup>

      <SettingsGroup
        id="import"
        title={t`Import`}
        description={t`Import decks from another app. Pictures, tags and review history come with them. Your other app is unchanged.`}
      >
        <ImportSources sourceLink={importLink} />
      </SettingsGroup>
    </Screen>
  );
}
