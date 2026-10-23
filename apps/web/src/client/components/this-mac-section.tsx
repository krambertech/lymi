import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useEffect, useState } from "react";
import {
  acceleratorFrom,
  desktop,
  type MacPreferences,
  type MacSetting,
  shortcutLabel,
} from "../lib/desktop";
import { Button } from "./button";
import { InlineError } from "./inline-error";
import { SettingsGroup } from "./settings-group";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** The Mac app's own settings, kept on the Mac. Shown only inside the Mac app. */
export function ThisMacSection() {
  const { t } = useLingui();
  const bridge = desktop();
  const [prefs, setPrefs] = useState<MacPreferences | null>(null);
  const [recording, setRecordingState] = useState(false);
  const setRecording = (on: boolean) => {
    setRecordingState(on);
    bridge?.setRecordingShortcut(on);
  };
  const [error, setError] = useState<string | null>(null);

  // Leaving the screen mid-recording, by a menu shortcut say, gives the shortcut back.
  useEffect(() => {
    if (recording) return () => bridge?.setRecordingShortcut(false);
  }, [recording, bridge]);

  useEffect(() => {
    if (!bridge) return;
    const load = () => void bridge.preferences().then(setPrefs);
    load();
    // Accessibility is switched on in System Settings, so coming back here reads it again.
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [bridge]);

  if (!bridge || !prefs) return null;
  const keys = shortcutLabel(prefs.shortcut);
  const version = prefs.version;

  async function save<K extends MacSetting>(key: K, value: MacPreferences[K]) {
    if (!bridge) return;
    const saved = await bridge.setPreference(key, value);
    setPrefs(saved.preferences);
    setError(
      saved.ok
        ? null
        : saved.reason === "taken"
          ? t`Another app already uses that shortcut. Try a different one.`
          : t`Couldn’t save that. Try again.`,
    );
  }

  function onRecordKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setRecording(false);
      return;
    }
    if (e.key === "Tab") return;
    e.preventDefault();
    const accelerator = acceleratorFrom(e);
    if (!accelerator) return;
    setRecording(false);
    void save("shortcut", accelerator);
  }

  return (
    <SettingsGroup
      id="this-mac"
      title={t`This Mac`}
      description={t`Saved on this Mac only, so each Mac keeps its own.`}
    >
      <div className="grid gap-2">
        <div className="edge grid rounded-md bg-plate">
          <Row
            label={t`Quick add`}
            description={
              recording
                ? t`Press the new shortcut with ⌘ or ⌃. Esc keeps the old one.`
                : t`Opens quick add over any app.`
            }
          >
            <Button
              size="sm"
              onClick={() => setRecording(!recording)}
              onKeyDown={recording ? onRecordKey : undefined}
              onBlur={() => setRecording(false)}
              aria-label={t`Quick add shortcut: ${keys}. Change`}
              className="min-w-24 tabular-nums"
            >
              {recording ? t`Press keys` : keys}
            </Button>
          </Row>
          <SwitchRow
            label={t`Due count in the menu bar`}
            description={t`Beside the lantern, when cards are due.`}
            checked={prefs.showDue}
            onChange={(on) => void save("showDue", on)}
          />
          <SwitchRow
            label={t`Fill in selected text`}
            description={
              prefs.accessibility
                ? t`Quick add starts with the text you selected in the app in front.`
                : t`macOS has to allow Lymi first, under Privacy & Security, Accessibility.`
            }
            checked={prefs.fillSelection}
            onChange={(on) => void save("fillSelection", on)}
            action={
              !prefs.accessibility && (
                <Button size="sm" onClick={() => bridge.allowAccessibility()}>
                  {t`Open System Settings`}
                </Button>
              )
            }
          />
          <SwitchRow
            label={t`Open at login`}
            description={t`Lymi waits in the menu bar from the moment you sign in to your Mac.`}
            checked={prefs.openAtLogin}
            onChange={(on) => void save("openAtLogin", on)}
          />
        </div>
        {error && <InlineError>{error}</InlineError>}
        <p className="text-sm text-muted">{t`Lymi for Mac ${version}`}</p>
      </div>
    </SettingsGroup>
  );
}

interface RowProps {
  label: string;
  description: string;
  children: ReactNode;
}

function Row({ label, description, children }: RowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-base text-text">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

interface SwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  action?: ReactNode;
}

function SwitchRow({ label, description, checked, onChange, action }: SwitchRowProps) {
  return (
    <Field orientation="horizontal" className="relative gap-3 border-t border-edge px-4 py-3.5">
      <FieldContent className="gap-0.5">
        <FieldLabel className="text-base text-text">{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      {action}
      <Switch className="self-center" checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}
