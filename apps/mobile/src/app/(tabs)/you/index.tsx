import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { outboxSize } from "@lymi/client/grades";
import { dropQueued } from "@lymi/client/queued";
import { flushWrites, pendingWrites } from "@lymi/client/writes";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { Alert, View } from "react-native";
import { authClient, localizedSiteUrl, siteUrl } from "../../../auth/client";
import { useDecks, useInsights } from "../../../data/queries";
import { ExportSheet } from "../../../export/export-sheet";
import { RunStrip } from "../../../insights/figures";
import { chooseTheme, savedTheme, type ThemeChoice } from "../../../theme/choice";
import { usePalette } from "../../../theme/palette";
import { Select } from "../../../ui/menu";
import { Icon, Plate, Press, RowArrow, SectionTitle, Text } from "../../../ui/primitives";
import { Row, RowFace, Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Avatar } from "../../../you/avatar";
import { LanguageNote, LanguageRow, useAppLanguage } from "../../../you/language";
import { ProfileSheet, useProfile } from "../../../you/profile";
import { Blocked, ReminderSwitch, TimeRow, useReminder } from "../../../you/reminder";

/** The API reference, where publishing and deck reports are done with a key. ADR 0028. */
const API_DOCS = siteUrl("/docs/api");

/**
 * Everything about the learner, and every setting: Insights first, then this phone's reminder, the
 * account's language, this phone's theme, Activity, the learner's data, feedback, the privacy
 * policy and sign-out.
 * phone.md "Navigation", ADR 0036.
 */
export default function You() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeChoice>(savedTheme);
  const reminder = useReminder();
  const language = useAppLanguage();
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Publishing and its reports are done with an API key by the few accounts Lymi lets publish.
  const publishes = useDecks().data?.some((d) => d.role === "owner" && d.published) ?? false;
  const themes: { value: ThemeChoice; label: string }[] = [
    { value: "system", label: t`System` },
    { value: "light", label: t`Light` },
    { value: "dark", label: t`Dark` },
  ];

  return (
    <Screen title={t`You`} kind="tab">
      <Profile profile={profile} onPress={() => setEditing(true)} />

      <InsightsPlate onPress={() => router.push("/you/insights")} />

      <View className="gap-2">
        <Rows>
          <ReminderSwitch reminder={reminder} />
          {reminder.time && <TimeRow reminder={reminder} />}
        </Rows>
        {reminder.blocked && <Blocked />}
      </View>

      <View className="gap-2">
        <Rows>
          <LanguageRow language={language} />
          <Select
            label={t`Theme`}
            value={theme}
            options={themes}
            onChange={(choice) => {
              setTheme(choice);
              chooseTheme(choice);
            }}
            trigger={
              <RowFace
                icon="theme"
                label={t`Theme`}
                value={themes.find((o) => o.value === theme)?.label}
              />
            }
          />
        </Rows>
        <LanguageNote language={language} />
      </View>

      <Rows>
        <Row icon="activity" label={t`Activity`} onPress={() => router.push("/you/activity")} />
      </Rows>

      <View>
        <SectionTitle>{t`Your data`}</SectionTitle>
        <Rows>
          <Row icon="import" label={t`Import`} onPress={() => router.push("/import")} />
          <Row icon="export" label={t`Export library`} onPress={() => setExporting(true)} />
          <Row icon="keys" label={t`API keys`} onPress={() => router.push("/you/api-keys")} />
          <Row
            icon="apps"
            label={t`Connected apps`}
            onPress={() => router.push("/you/connected-apps")}
          />
          {publishes && (
            <Row
              icon="publish"
              label={t`Publishing and deck reports`}
              end="web"
              onPress={() => openBrowserAsync(API_DOCS)}
            />
          )}
        </Rows>
      </View>

      <Rows>
        <Row
          icon="feedback"
          label={t`Send feedback`}
          onPress={() => router.push("/you/feedback")}
        />
        <Row
          icon="privacy"
          label={t`Privacy policy`}
          end="web"
          onPress={() => void openBrowserAsync(localizedSiteUrl("/privacy", i18n.locale))}
        />
      </Rows>

      <SignOut />

      <Rows>
        <Row
          icon="delete"
          label={t`Delete account`}
          destructive
          onPress={() => router.push("/you/delete-account")}
        />
      </Rows>

      <ProfileSheet open={editing} onOpenChange={setEditing} profile={profile} />
      <ExportSheet open={exporting} onOpenChange={setExporting} scope={{ kind: "library" }} />
    </Screen>
  );
}

/** Who is signed in, at the top; the whole plate opens the sheet that edits the name and photo. */
function Profile({
  profile,
  onPress,
}: {
  profile: ReturnType<typeof useProfile>;
  onPress: () => void;
}) {
  const { t } = useLingui();
  const { name, email, pending, error } = profile;
  return (
    <View className="gap-2">
      <Press
        scale={0.98}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[name, email].filter(Boolean).join(", ")}
        accessibilityHint={t`Edit your name and photo`}
      >
        <Plate className="flex-row items-center gap-4 p-4">
          <Avatar name={name} size={56} pending={pending} />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-medium text-text" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-base text-muted" numberOfLines={1}>
              {email}
            </Text>
          </View>
          <RowArrow />
        </Plate>
      </Press>
      {error && (
        <Text className="px-1 text-base text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

/**
 * Insights as one plate that opens the page: the month's recall and the thirty days, the two figures
 * a glance can carry. Until they load, or before a first review, it says what the page holds.
 */
function InsightsPlate({ onPress }: { onPress: () => void }) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const { data } = useInsights(30);
  const reviewed = data && data.consistency.daysAllTime > 0;
  const recall =
    data?.recall.rate == null ? "—" : i18n.number(data.recall.rate, { style: "percent" });
  return (
    <Press
      scale={0.98}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={
        reviewed
          ? t`Insights: recall ${recall}, reviewed on ${data.consistency.lit} of the last 30 days`
          : t`Insights`
      }
    >
      <Plate className="gap-4 p-5">
        <View className="flex-row items-center gap-4">
          <View className="size-11 items-center justify-center rounded-full bg-plate-2">
            <Icon name="insights" size={22} colour={p["text-2"]} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-medium text-text">{t`Insights`}</Text>
            {!reviewed && (
              <Text className="text-base text-muted">{t`How your memory is doing`}</Text>
            )}
          </View>
          <RowArrow />
        </View>
        {reviewed && (
          <View className="gap-3">
            <View className="flex-row gap-6">
              <View className="gap-0.5">
                <Text className="text-2xl font-medium tracking-tight text-text">{recall}</Text>
                <Text className="text-sm text-muted">{t`Recall`}</Text>
              </View>
              <View className="gap-0.5">
                <Text className="text-2xl font-medium tracking-tight text-text">
                  {i18n.number(data.consistency.lit)}
                  <Text className="text-base font-normal text-muted"> / 30</Text>
                </Text>
                <Text className="text-sm text-muted">{t`Days reviewed`}</Text>
              </View>
            </View>
            <RunStrip days={data.consistency.days} height={20} />
          </View>
        )}
      </Plate>
    </Press>
  );
}

function SignOut() {
  const { t } = useLingui();
  const [signingOut, setSigningOut] = useState(false);
  const leave = async () => {
    setSigningOut(true);
    // The stored session is cleared before the request, so an unreachable Worker still signs out.
    await authClient.signOut().catch(() => undefined);
    // The root forgets the rest of this learner once the session is gone, as the web does.
    dropQueued();
    setSigningOut(false);
  };
  // Work made offline lives only on this phone until it lands, so losing it is never the default.
  const signOut = async () => {
    setSigningOut(true);
    await flushWrites().catch(() => undefined);
    const queued = outboxSize() + pendingWrites();
    if (queued === 0) return leave();
    setSigningOut(false);
    Alert.alert(
      t`Some offline work hasn’t synced`,
      plural(queued, {
        one: "# grade or change made offline is still waiting to reach Lymi. Sign out once you’re back online to keep it.",
        other:
          "# grades and changes made offline are still waiting to reach Lymi. Sign out once you’re back online to keep them.",
      }),
      [
        { text: t`Stay signed in`, style: "cancel" },
        { text: t`Sign out and lose them`, style: "destructive", onPress: () => void leave() },
      ],
    );
  };
  return (
    <View
      className={signingOut ? "opacity-45" : undefined}
      pointerEvents={signingOut ? "none" : "auto"}
    >
      <Rows>
        <Row
          icon="signOut"
          label={t`Sign out`}
          end="none"
          destructive
          onPress={() => void signOut()}
        />
      </Rows>
    </View>
  );
}
