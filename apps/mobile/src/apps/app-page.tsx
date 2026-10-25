import { useLingui } from "@lingui/react/macro";
import { mergeActivity } from "@lymi/client/activity";
import { appActivityQuery } from "@lymi/client/queries";
import { isolate } from "@lymi/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { type ReactNode, useEffect, useState } from "react";
import { AccessibilityInfo, Alert, View } from "react-native";
import { ActivityList } from "../activity/activity-view";
import { captureEvent } from "../telemetry/posthog";
import { usePalette } from "../theme/palette";
import { Chip, type ChipTone } from "../ui/chip";
import { clipboard } from "../ui/clipboard";
import { FieldError } from "../ui/field";
import { Button, Icon, Plate, Press, RowArrow, SectionTitle, Text } from "../ui/primitives";
import { Screen } from "../ui/screen";
import { Skeleton } from "../ui/skeleton";

/** The apps whose pages Lymi knows, as the analytics events name them. */
export type AppKey = "readwise" | "yomitan" | "claude" | "chatgpt" | "other";

export type AppStatus = {
  label: string;
  tone: "good" | "muted" | "danger";
  detail?: ReactNode;
};

const TONE: Record<AppStatus["tone"], ChipTone> = {
  good: "good",
  muted: "default",
  danger: "danger",
};

/**
 * One page for an app that writes to the learner's decks, pushed from Apps: its header, then
 * Settings, Activity, How it connects and Stop, in that order. docs/design/app-pages.md.
 */
export function AppPage({
  appKey,
  name,
  mark,
  badge,
  status,
  does,
  action,
  children,
}: {
  appKey: AppKey;
  name: string;
  mark: ReactNode;
  /** Beside the name, such as Unverified. */
  badge?: ReactNode;
  status: AppStatus | undefined;
  /** What the app does for the learner, in one line. */
  does: string;
  /** The app's one everyday action, such as Check now. */
  action?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    captureEvent("app_page_viewed", { app: appKey });
  }, [appKey]);
  const { t } = useLingui();
  return (
    <Screen
      title={name}
      back={{ label: t`Apps`, to: "/you/apps" }}
      titleAt={64}
      header={
        <View className="gap-4">
          <View className="flex-row items-center gap-4">
            {mark}
            <View className="flex-1 gap-1.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-2xl font-medium text-text" accessibilityRole="header">
                  {name}
                </Text>
                {badge && <View className="self-center">{badge}</View>}
              </View>
              {status ? (
                <Chip size="sm" tone={TONE[status.tone]}>
                  {status.label}
                </Chip>
              ) : (
                <Skeleton width={88} height={22} />
              )}
            </View>
          </View>
          {status?.detail}
          <Text className="text-base text-text-2">{does}</Text>
          {action}
        </View>
      }
    >
      {children}
    </Screen>
  );
}

/** A line under the header's status, such as when an app connected. */
export function StatusLine({ children }: { children: ReactNode }) {
  return (
    <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
      {children}
    </Text>
  );
}

/** One part of an app's page under its heading. */
export function AppSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View className="gap-3">{children}</View>
    </View>
  );
}

/** The app's latest writes from Activity, with the way to all of them. */
export function AppActivity({
  appKey,
  app,
  name,
  limit = 5,
}: {
  appKey: AppKey;
  /** The audit rows' `actor_client` for this app. */
  app: string;
  name: string;
  limit?: number;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const router = useRouter();
  const activity = useInfiniteQuery(appActivityQuery(app));
  const page = activity.data?.pages[0];
  const entries = page ? mergeActivity(page.entries).slice(0, limit) : undefined;
  return (
    <AppSection title={t`Activity`}>
      {activity.isError && !entries ? (
        <FieldError>
          {t`Couldn’t load what ${{ app: isolate(name) }} did. Check your connection and try again.`}
        </FieldError>
      ) : !entries ? (
        <Skeleton height={144} />
      ) : entries.length === 0 ? (
        <Plate className="items-center gap-1.5 px-5 py-6">
          <View className="mb-1 size-12 items-center justify-center rounded-full bg-plate-2">
            <Icon name="activity" size={22} colour={p["text-2"]} strokeWidth={1.75} />
          </View>
          <Text className="text-center text-md font-medium text-text">
            {t`Nothing from ${{ app: isolate(name) }} yet`}
          </Text>
          <Text className="text-center text-base text-text-2">
            {t`What it adds, edits or archives shows here.`}
          </Text>
        </Plate>
      ) : (
        <ActivityList
          entries={entries}
          today={page?.today}
          zone={page?.zone}
          onCardsOpened={() => captureEvent("app_activity_opened", { app: appKey, how: "card" })}
          foot={
            <Press
              scale={0.99}
              accessibilityRole="link"
              onPress={() => {
                captureEvent("app_activity_opened", { app: appKey, how: "all" });
                router.push({ pathname: "/you/activity", params: { app } } as Href);
              }}
            >
              <View className="min-h-[52px] flex-row items-center gap-3 py-3 ps-4 pe-4">
                <Text className="flex-1 text-md font-medium text-text">
                  {t`Everything ${{ app: isolate(name) }} did, in Activity`}
                </Text>
                <RowArrow />
              </View>
            </Press>
          }
        />
      )}
    </AppSection>
  );
}

/** How the app reaches Lymi: a line, numbered steps, what to copy or fill in, and its guide. */
export function AppConnect({
  name,
  intro,
  steps,
  guide,
  children,
}: {
  name: string;
  intro: string;
  steps: ReactNode[];
  /** The guide's address; left out until the guide is written. */
  guide?: string | undefined;
  /** What the learner copies or fills in here, such as Lymi's address. */
  children?: ReactNode;
}) {
  const { t } = useLingui();
  return (
    <AppSection title={t`How it connects`}>
      <Plate className="gap-4 p-4">
        <Text className="text-base text-text-2">{intro}</Text>
        <View className="gap-3">
          {steps.map((step, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the steps are fixed and never reorder
            <View key={i} className="flex-row gap-3">
              <View className="size-7 items-center justify-center rounded-full border border-edge bg-plate-2">
                <Text
                  className="text-sm font-semibold text-text"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {String(i + 1)}
                </Text>
              </View>
              <View className="flex-1 pt-0.5">{step}</View>
            </View>
          ))}
        </View>
        {children}
        {guide && (
          <View className="border-t border-edge pt-4">
            <Button
              label={t`Read the ${{ app: isolate(name) }} guide`}
              icon="lesson"
              onPress={() => void openBrowserAsync(guide)}
            />
          </View>
        )}
      </Plate>
    </AppSection>
  );
}

/** A step's sentence, in the step's text style. */
export function Step({ children }: { children: ReactNode }) {
  return <Text className="text-base text-text-2">{children}</Text>;
}

/** A name inside a step the learner looks for in the other app, such as a menu. */
export function B({ children }: { children: ReactNode }) {
  return <Text className="font-medium text-text">{children}</Text>;
}

/** Text the learner copies into the other app, named for what it is, with Copy beside it. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const { t } = useLingui();
  const p = usePalette();
  const [copied, setCopied] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="px-1 text-sm font-medium text-text-2">{label}</Text>
      <View className="min-h-11 flex-row items-center gap-2 rounded-md bg-plate-2 py-1 ps-3 pe-1">
        <Text
          selectable
          className="flex-1 text-sm text-text"
          style={{ fontFamily: "Menlo" }}
          accessibilityLabel={`${label}, ${value}`}
        >
          {value}
        </Text>
        {clipboard && (
          <Press
            onPress={() => {
              clipboard?.setString(value);
              setCopied(true);
              AccessibilityInfo.announceForAccessibility(t`Copied`);
            }}
            accessibilityRole="button"
            accessibilityLabel={copied ? t`Copied` : t`Copy ${{ label: isolate(label) }}`}
            className="h-9 flex-row items-center gap-1.5 rounded-sm px-2.5"
          >
            <Icon name={copied ? "check" : "copy"} size={16} colour={p["text-2"]} />
            <Text className="text-sm font-medium text-text-2">{copied ? t`Copied` : t`Copy`}</Text>
          </Press>
        )}
      </View>
    </View>
  );
}

/**
 * The way to cut the app off: what goes and what stays, then one danger button that asks in iOS's
 * alert, since it can't be undone.
 */
export function AppStop({
  consequence,
  label,
  keep,
  onStop,
  stopping,
  error,
}: {
  consequence: string;
  label: string;
  /** The safe choice in the alert, such as Stay connected. */
  keep: string;
  onStop: () => void;
  stopping: boolean;
  error?: string | null | undefined;
}) {
  const { t } = useLingui();
  return (
    <AppSection title={t`Stop`}>
      <Text className="px-1 text-base text-muted">{consequence}</Text>
      <Button
        label={label}
        variant="danger"
        loading={stopping}
        onPress={() =>
          Alert.alert(label, consequence, [
            { text: keep, style: "cancel" },
            { text: label, style: "destructive", onPress: onStop },
          ])
        }
      />
      <FieldError>{error}</FieldError>
    </AppSection>
  );
}
