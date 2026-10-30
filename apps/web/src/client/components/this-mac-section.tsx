import { useLingui } from "@lingui/react/macro";
import { cn } from "cn";
import { type ReactNode, useEffect, useState } from "react";
import {
  acceleratorFrom,
  desktop,
  type MacPreferences,
  type MacSetting,
  type MacUpdate,
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
    const stopUpdates = bridge.onUpdate?.((update) =>
      setPrefs((current) => current && { ...current, update }),
    );
    return () => {
      window.removeEventListener("focus", load);
      stopUpdates?.();
    };
  }, [bridge]);

  if (!bridge || !prefs) return null;
  const keys = shortcutLabel(prefs.shortcut);
  const version = prefs.version;
  const updateLines: Record<MacUpdate | "unknown", string> = {
    unknown: t`Version ${version}.`,
    checking: t`Version ${version}. Checking for updates…`,
    current: t`Version ${version}. Up to date.`,
    downloading: t`Version ${version}. Downloading an update…`,
    ready: t`An update is ready. It installs when Lymi restarts.`,
  };

  async function save<K extends MacSetting>(key: K, value: MacPreferences[K]) {
    if (!bridge) return;
    const saved = await bridge.setPreference(key, value);
    if (!saved) return setError(t`Couldn’t save that. Try again.`);
    setPrefs(saved.preferences);
    if (saved.ok) return setError(null);
    setError(
      saved.reason === "taken"
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
          <Row label={t`Lymi for Mac`} description={updateLines[prefs.update ?? "unknown"]}>
            {prefs.update === "ready" && bridge.restartToUpdate && (
              <Button size="sm" variant="primary" onClick={() => bridge.restartToUpdate?.()}>
                {t`Restart to update`}
              </Button>
            )}
          </Row>
          <Row
            className="border-t border-edge"
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
              className={cn(
                "min-w-24 tabular-nums",
                recording && "outline-2 outline-offset-2 outline-ring",
              )}
            >
              {recording ? t`Press keys` : keys}
            </Button>
          </Row>
          {prefs.showInMenuBar !== undefined && (
            <SwitchRow
              label={t`Show in the menu bar`}
              description={
                prefs.showInMenuBar
                  ? t`The lantern opens Lymi, quick add and review from the top of the screen.`
                  : t`Lymi stays in the Dock instead.`
              }
              checked={prefs.showInMenuBar}
              onChange={(on) => void save("showInMenuBar", on)}
            />
          )}
          <SwitchRow
            label={t`Due count beside the lantern`}
            description={t`How many cards are due, next to the lantern in the menu bar.`}
            checked={prefs.showDue}
            disabled={prefs.showInMenuBar === false}
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
            description={t`Lymi starts when you sign in to your Mac, ready for quick add.`}
            checked={prefs.openAtLogin}
            onChange={(on) => void save("openAtLogin", on)}
          />
        </div>
        {error && <InlineError>{error}</InlineError>}
      </div>
    </SettingsGroup>
  );
}

// Every row's name, so a row with a button reads the same as one with a switch.
const LABEL = "text-base font-medium text-ink";

interface RowProps {
  label: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

function Row({ label, description, children, className }: RowProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", className)}>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className={LABEL}>{label}</p>
        <p className="text-sm text-ink-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

interface SwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
  action?: ReactNode;
}

function SwitchRow({ label, description, checked, disabled, onChange, action }: SwitchRowProps) {
  return (
    <Field
      orientation="horizontal"
      disabled={disabled}
      className="relative gap-3 border-t border-edge px-4 py-3.5"
    >
      <FieldContent className="gap-0.5">
        {/* Stretched over the row, so a click on the sentence flips the switch too. */}
        <FieldLabel className={cn(LABEL, "after:absolute after:inset-0 after:content-['']")}>
          {label}
        </FieldLabel>
        <FieldDescription>{description}</FieldDescription>
        {/* Under the sentence it answers, so the switch keeps the column the others line up on. */}
        {action && <div className="relative mt-2 w-fit">{action}</div>}
      </FieldContent>
      <Switch
        className="self-center"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </Field>
  );
}
