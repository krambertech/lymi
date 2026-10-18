import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { useDailyGoal } from "@lymi/client/daily-goal";
import { GOAL_MINUTES } from "@lymi/client/welcome";
import { DAILY_GOAL_PRESETS } from "@lymi/core";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { DEFAULT_TIME, supportsPush, turnOnReminder } from "../lib/push-reminder";
import { useInstallState } from "../lib/pwa-install";
import { Button } from "./button";
import { GOAL_NAMES } from "./goal-picker";
import { NavLink } from "./nav-link";
import { Segmented } from "./segmented";

type Reminder = "loading" | "off" | "on" | "denied" | "dismissed" | "install" | "error" | "none";

/**
 * The end of the first review asks the two things that keep it going: how much a day, and whether to
 * be reminded. Each saves on the press; both stay changeable in the streak and Settings.
 */
export function FirstReviewSetUp({ goal }: { goal: number }) {
  const { t, i18n } = useLingui();
  const daily = useDailyGoal();
  const install = useInstallState();
  const [key, setKey] = useState<string | null>(null);
  const [reminder, setReminder] = useState<Reminder>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (install.isIOS && !install.installed) {
      setReminder("install");
      return;
    }
    if (!supportsPush()) {
      setReminder("none");
      return;
    }
    // Loaded before any press, because awaiting it inside the press would cost the browser's prompt.
    api
      .pushConfig()
      .then(async ({ publicKey }) => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const status = subscription && (await api.pushStatus({ endpoint: subscription.endpoint }));
        if (!live) return;
        setKey(publicKey);
        setReminder(status?.enabled ? "on" : "off");
      })
      .catch(() => live && setReminder("none"));
    return () => {
      live = false;
    };
  }, [install.isIOS, install.installed]);

  const turnOn = async () => {
    if (!key) return;
    setBusy(true);
    try {
      setReminder(await turnOnReminder(key));
    } catch {
      setReminder("error");
    } finally {
      setBusy(false);
    }
  };

  const time = DEFAULT_TIME;
  const preset = (DAILY_GOAL_PRESETS as readonly number[]).includes(goal);
  const minutes = preset ? GOAL_MINUTES[goal as (typeof DAILY_GOAL_PRESETS)[number]] : 0;
  return (
    <section
      aria-labelledby="first-review-set-up"
      className="edge grid w-full gap-4 rounded-xl bg-plate p-4 text-start"
    >
      {/* The four presets in one row: the streak's picker is the place for a number of one's own. */}
      <div className="grid gap-2.5">
        <h3 id="first-review-set-up" className="text-md font-medium">
          <Trans>Your daily goal</Trans>
        </h3>
        <Segmented
          label={t`Daily goal`}
          value={String(goal)}
          onValueChange={(v) => daily.change(Number(v))}
          options={DAILY_GOAL_PRESETS.map((n) => ({
            value: String(n),
            label: i18n._(GOAL_NAMES[n]),
          }))}
          className="w-full"
        />
        <p className="text-sm text-muted">
          {preset ? (
            <Plural
              value={goal}
              one={`# review a day, about ${minutes} minutes`}
              other={`# reviews a day, about ${minutes} minutes`}
            />
          ) : (
            <Plural value={goal} one="# review a day" other="# reviews a day" />
          )}
        </p>
      </div>
      {reminder !== "none" && reminder !== "loading" && (
        <div className="grid gap-2 border-t border-edge pt-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 size-5 shrink-0 text-text-2" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-md font-medium">
                <Trans>Remind me each evening</Trans>
              </span>
              <span className="text-sm text-muted text-pretty" aria-live="polite">
                {reminder === "on" ? (
                  <Trans>On at {time} on this device. Change it in Settings.</Trans>
                ) : reminder === "denied" ? (
                  <Trans>
                    Notifications are blocked. Allow them in your browser or device settings, then
                    turn the reminder on in Settings.
                  </Trans>
                ) : reminder === "dismissed" ? (
                  <Trans>Reminders stay off until notifications are allowed.</Trans>
                ) : reminder === "install" ? (
                  <Trans>
                    On iPhone, add Lymi to your Home Screen first, then turn it on in Settings.
                  </Trans>
                ) : reminder === "error" ? (
                  <Trans>Couldn’t save the reminder. Check your connection and try again.</Trans>
                ) : (
                  <Trans>A reminder at {time} on this device.</Trans>
                )}
              </span>
            </div>
            {(reminder === "off" || reminder === "dismissed" || reminder === "error") && (
              <Button
                size="sm"
                onClick={turnOn}
                loading={busy}
                aria-label={t`Turn on the reminder`}
              >
                <Trans>Turn on</Trans>
              </Button>
            )}
            {reminder === "install" && (
              <Button size="sm" render={<NavLink to="/settings" hash="reminder" />}>
                <Trans>Settings</Trans>
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
