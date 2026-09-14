import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { PushSubscriptionInput, ReminderTime } from "@lymi/core";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";
import { useInstallState } from "../lib/pwa-install";
import { Button } from "./button";
import { InstallDialog } from "./install-dialog";
import { SettingsGroup } from "./settings-group";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

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

/** Resolved when the error happens, so the sentence is in the language active at the time. */
function messageFor(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return i18n._(msg`Couldn’t save the reminder. Check your connection and try again.`);
}

export function NotificationsSection() {
  const { t } = useLingui();
  const install = useInstallState();
  const [installHelp, setInstallHelp] = useState(false);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  /** Why the switch cannot be used yet, found while loading. State, not a fault of the learner's. */
  const [blocked, setBlocked] = useState<"unconfigured" | "unreachable" | null>(null);
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
        // Nothing was asked for yet, so a missing server key or a dead network is the switch's
        // description rather than an alert the learner has to read on arrival.
        if (live)
          setBlocked(
            cause instanceof ApiError && cause.status === 503 ? "unconfigured" : "unreachable",
          );
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
      setError(t`Not available on this server yet.`);
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          permission === "denied"
            ? t`Notifications are blocked. Allow them in your browser or device settings, then try again.`
            : t`Reminders stay off until notifications are allowed.`,
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
      setNotice(t`Reminder on for this device.`);
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
      setNotice(t`Reminder off for this device.`);
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
      setNotice(t`Reminder time saved.`);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  const pushSupported = supportsPush();
  const needsInstall = install.isIOS && !install.installed;
  const permissionBlocked = pushSupported && Notification.permission === "denied";
  const unusable = !needsInstall && (!ready || !vapidPublicKey);
  const validTime = /^([01]\d|2[0-3]):(00|15|30|45)$/.test(time);
  const reminderAvailable = pushSupported || needsInstall;
  const zone = timezone().replaceAll("_", " ");

  return (
    <SettingsGroup
      title={t`Daily reminder`}
      description={t`A notification on this device when cards are due.`}
    >
      {!reminderAvailable ? (
        <p className="text-base text-muted">
          <Trans>This browser can’t show reminders.</Trans>
        </p>
      ) : (
        <div className="edge grid rounded-md bg-plate">
          <Field
            orientation="horizontal"
            disabled={unusable || busy || permissionBlocked}
            className="relative gap-3 px-4 py-3.5"
          >
            <span
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-plate-2 text-text-2"
              aria-hidden="true"
            >
              <Bell className="size-4" />
            </span>
            <FieldContent className="gap-0.5">
              {/* Stretched over the row, so a tap on the bell or the sentence flips the switch too. */}
              <FieldLabel className="text-base text-text after:absolute after:inset-0 after:content-['']">
                <Trans>Send a daily reminder</Trans>
              </FieldLabel>
              <FieldDescription>
                {needsInstall
                  ? t`Add Lymi to your Home Screen first. iPhone and iPad only allow reminders from there.`
                  : blocked === "unconfigured"
                    ? t`Not available on this server yet.`
                    : blocked === "unreachable"
                      ? t`Couldn’t check this device. Reload to try again.`
                      : permissionBlocked
                        ? t`Notifications are blocked. Allow them in your browser or device settings.`
                        : enabled
                          ? t`At ${savedTime}, ${zone} time, only on days with cards due.`
                          : t`Only on days with cards due.`}
              </FieldDescription>
            </FieldContent>
            {/* One line tall at the label's size, so the track centres on the label's first line. */}
            <span className="flex h-lh shrink-0 items-center text-base">
              <Switch
                checked={enabled}
                onCheckedChange={(on) => void (on ? enable() : disable())}
              />
            </span>
          </Field>
          {enabled && (
            <div className="flex flex-wrap items-end gap-3 border-t border-edge px-4 py-3.5">
              <Field className="w-40">
                <FieldLabel>{t`Time`}</FieldLabel>
                <Input
                  type="time"
                  step={900}
                  value={time}
                  disabled={busy}
                  onChange={(event) => setTime(event.target.value as ReminderTime)}
                />
                {!validTime && <FieldError>{t`Choose 00, 15, 30 or 45 minutes.`}</FieldError>}
              </Field>
              <Button
                aria-disabled={busy || time === savedTime || !validTime}
                onClick={() => void saveTime()}
              >
                <Trans>Save time</Trans>
              </Button>
            </div>
          )}
        </div>
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

      {needsInstall && (
        <InstallDialog open={installHelp} onClose={() => setInstallHelp(false)} ios />
      )}
    </SettingsGroup>
  );
}
