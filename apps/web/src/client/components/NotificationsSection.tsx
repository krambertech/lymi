import type { PushSubscriptionInput, ReminderTime } from "@lymi/core";
import { Bell, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";
import { promptToInstall, useInstallState } from "../lib/pwa-install";
import { SettingsGroup } from "../views/YouView";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field, Input } from "./Field";
import { Switch } from "./Switch";

const DEFAULT_TIME: ReminderTime = "19:00";

function supportsPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function timezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function publicKeyBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function subscriptionInput(
  subscription: PushSubscription,
  reminderTime: ReminderTime,
): PushSubscriptionInput {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("This browser did not return a complete push subscription");
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    reminderTime,
    timezone: timezone(),
  };
}

function messageFor(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Unable to save the reminder. Check your connection and try again.";
}

export function NotificationsSection() {
  const install = useInstallState();
  const [installHelp, setInstallHelp] = useState(false);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [time, setTime] = useState<ReminderTime>(DEFAULT_TIME);
  const [savedTime, setSavedTime] = useState<ReminderTime>(DEFAULT_TIME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      if (!supportsPush()) {
        if (live) setReady(true);
        return;
      }
      try {
        // Load the application key before a click. Awaiting a network request inside enable()
        // can consume the transient user activation required for the permission prompt.
        const { publicKey } = await api.pushConfig();
        if (live) setVapidPublicKey(publicKey);
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;
        const status = await api.pushStatus({ endpoint: subscription.endpoint });
        if (!live || !status.enabled || !status.reminderTime) return;
        setEnabled(true);
        setTime(status.reminderTime);
        setSavedTime(status.reminderTime);
      } catch (cause) {
        if (live) setError(messageFor(cause));
      } finally {
        if (live) setReady(true);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, []);

  async function enable() {
    setError(null);
    setNotice(null);
    if (install.isIOS && !install.installed) {
      setInstallHelp(true);
      return;
    }
    if (!vapidPublicKey) {
      setError("Reminders are not configured yet.");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          permission === "denied"
            ? "Notifications are blocked. Allow them in your browser or device settings, then try again."
            : "Notifications weren't enabled. You can try again when you're ready.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKeyBytes(vapidPublicKey),
        }));
      await api.savePushSubscription(subscriptionInput(subscription, time));
      setEnabled(true);
      setSavedTime(time);
      setNotice("Daily reminder on for this device.");
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.removePushSubscription({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setNotice("Daily reminder off for this device.");
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveTime() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("Push subscription is missing");
      await api.savePushSubscription(subscriptionInput(subscription, time));
      setSavedTime(time);
      setNotice(`Reminder set for ${time}.`);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  const pushSupported = supportsPush();
  const needsInstall = install.isIOS && !install.installed;
  const permissionBlocked = pushSupported && Notification.permission === "denied";
  const validTime = /^([01]\d|2[0-3]):(00|15|30|45)$/.test(time);
  const reminderAvailable = pushSupported || needsInstall;

  return (
    <>
      <SettingsGroup title="App">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="grid max-w-[42ch] gap-0.5">
            <span className="flex items-center gap-2 text-base font-medium">
              <Download className="size-4 text-muted" aria-hidden="true" />
              Install Lymi
            </span>
            <span className="text-sm text-muted">
              {install.installed
                ? "Installed on this device."
                : "Open Lymi like an app and allow review reminders."}
            </span>
          </span>
          {!install.installed && (
            <Button
              size="sm"
              onClick={async () => {
                if (install.canPrompt) await promptToInstall();
                else setInstallHelp(true);
              }}
            >
              {install.canPrompt ? "Install Lymi" : "View install steps"}
            </Button>
          )}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Reminders">
        {!reminderAvailable ? (
          <p className="text-sm text-muted">
            This browser does not support review reminders. You can still install and use Lymi.
          </p>
        ) : (
          <>
            <Switch
              checked={enabled}
              disabled={
                (!needsInstall && !ready) ||
                busy ||
                permissionBlocked ||
                (!needsInstall && !vapidPublicKey)
              }
              onChange={(on) => void (on ? enable() : disable())}
              label={
                <span className="flex items-center gap-2">
                  <Bell className="size-4 text-muted" aria-hidden="true" />
                  Send a daily review reminder
                </span>
              }
              description={
                permissionBlocked
                  ? "Notifications are blocked in your browser or device settings."
                  : needsInstall
                    ? "Install Lymi first. iPhone and iPad only allow web-app reminders after installation."
                    : !vapidPublicKey
                      ? "Reminders are not configured yet."
                      : "Only when cards are due. This setting applies to this device."
              }
            />
            {enabled && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <Field
                  label="Reminder time"
                  hint={`Uses ${timezone().replaceAll("_", " ")}.`}
                  error={validTime ? undefined : "Choose 00, 15, 30, or 45 minutes."}
                  className="w-44"
                >
                  <Input
                    type="time"
                    step={900}
                    value={time}
                    disabled={busy}
                    onChange={(event) => setTime(event.target.value as ReminderTime)}
                  />
                </Field>
                <Button
                  size="sm"
                  disabled={busy || time === savedTime || !validTime}
                  onClick={() => void saveTime()}
                >
                  Save reminder
                </Button>
              </div>
            )}
          </>
        )}
        <div className="min-h-5 text-sm" aria-live="polite">
          {error ? (
            <p className="text-danger" role="alert">
              {error}
            </p>
          ) : notice ? (
            <p className="text-muted">{notice}</p>
          ) : null}
        </div>
      </SettingsGroup>

      <Dialog
        open={installHelp}
        onClose={() => setInstallHelp(false)}
        title={install.isIOS ? "Add Lymi to your Home Screen" : "Install Lymi"}
        actions={<Button onClick={() => setInstallHelp(false)}>Close</Button>}
      >
        {install.isIOS ? (
          <ol className="grid list-decimal gap-2 pl-5">
            <li>Open Lymi in Safari and select Share.</li>
            <li>Select Add to Home Screen and keep Open as Web App on.</li>
            <li>Open Lymi from its new icon, then turn on the daily reminder.</li>
          </ol>
        ) : (
          <p>
            Open your browser menu and select Install Lymi or Add to Dock. Installation is not
            offered by every desktop browser.
          </p>
        )}
      </Dialog>
    </>
  );
}
