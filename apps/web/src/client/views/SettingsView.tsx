import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { AppLanguage } from "@lymi/core";
import type { ReactNode } from "react";
import { AccountGroup } from "../components/AccountSection";
import { Segmented } from "../components/Segmented";
import { SettingsGroup } from "../components/SettingsGroup";
import { Skeleton } from "../components/Skeleton";
import { Field, FieldLabel } from "../components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import type { Me } from "../lib/api";
import type { ThemeChoice } from "../lib/theme";
import { Page, PageHeader } from "./Shell";

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
 * Every setting, and nothing else. Where to go and how to leave live in the learner menu,
 * so this screen is only things with a value that can be changed.
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
}: SettingsProps) {
  const { t, i18n } = useLingui();
  return (
    <Page width="md">
      <PageHeader title={t`Settings`} />

      {account ?? <AccountGroup name={me?.name} email={me?.email} />}

      <SettingsGroup
        title={t`Language`}
        description={t`For the interface, and for the meanings the AI writes.`}
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
              <SelectContent aria-label={t`Language`}>
                {LANGUAGES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Skeleton className="h-10 w-56 rounded-md" />
        )}
        {languageError && (
          <p className="text-sm text-danger" role="alert">
            <Trans>Couldn’t save the language. Check your connection and try again.</Trans>
          </p>
        )}
      </SettingsGroup>

      <SettingsGroup title={t`Theme`} description={t`System follows your device.`}>
        <Segmented
          value={theme}
          onChange={onTheme}
          options={THEMES.map((o) => ({ value: o.value, label: i18n._(o.label) }))}
          label={t`Theme`}
        />
      </SettingsGroup>

      {children}
    </Page>
  );
}
