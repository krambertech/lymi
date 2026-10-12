import { useLingui } from "@lingui/react/macro";
import { dropQueued } from "@lymi/client/queued";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";
import { authClient } from "../../../auth/client";
import { useDecks } from "../../../data/queries";
import { chooseTheme, savedTheme, type ThemeChoice } from "../../../theme/choice";
import { usePalette } from "../../../theme/palette";
import { Select } from "../../../ui/menu";
import { openWeb } from "../../../ui/on-the-web";
import { Icon, Plate, Press, RowArrow, SectionTitle, Text } from "../../../ui/primitives";
import { Row, RowFace, Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Avatar } from "../../../you/avatar";
import { ProfileSheet, useProfile } from "../../../you/profile";
import { ReminderSheet, useReminder } from "../../../you/reminder";

/** The API reference, where publishing and deck reports are done with a key. ADR 0028. */
const API_DOCS = "https://lymi.app/docs/api";

/**
 * Everything about the learner: Insights first, then this phone's reminder and theme, the places
 * behind You, the setup jobs that stay on the web, feedback and sign-out. phone.md "Navigation",
 * ADR 0030.
 */
export default function You() {
  const { t } = useLingui();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeChoice>(savedTheme);
  const reminder = useReminder();
  const [reminding, setReminding] = useState(false);
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
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

      <Rows>
        <Row
          icon="reminder"
          label={t`Daily reminder`}
          value={reminder.label ?? t`Off`}
          onPress={() => setReminding(true)}
        />
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

      <Rows>
        <Row icon="activity" label={t`Activity`} onPress={() => router.push("/you/activity")} />
        <Row icon="settings" label={t`Settings`} onPress={() => router.push("/you/settings")} />
      </Rows>

      <View>
        <SectionTitle>{t`Your data`}</SectionTitle>
        <Rows>
          <Row icon="import" label={t`Import`} end="web" onPress={() => openWeb("/import")} />
          <Row
            icon="export"
            label={t`Export`}
            end="web"
            onPress={() => openWeb("/settings#export")}
          />
          <Row
            icon="keys"
            label={t`API keys`}
            end="web"
            onPress={() => openWeb("/settings#api-keys")}
          />
          <Row
            icon="apps"
            label={t`Connected apps`}
            end="web"
            onPress={() => openWeb("/settings#connected-apps")}
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
      </Rows>

      <SignOut />

      <ProfileSheet open={editing} onOpenChange={setEditing} profile={profile} />
      <ReminderSheet open={reminding} onOpenChange={setReminding} reminder={reminder} />
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

/** Insights as one plate; the whole of it opens the page. */
function InsightsPlate({ onPress }: { onPress: () => void }) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="link" accessibilityLabel={t`Insights`}>
      <Plate className="flex-row items-center gap-4 p-5">
        <View className="size-11 items-center justify-center rounded-full bg-plate-2">
          <Icon name="insights" size={22} colour={p["text-2"]} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-lg font-medium text-text">{t`Insights`}</Text>
          <Text className="text-base text-muted">{t`How your memory is doing`}</Text>
        </View>
        <RowArrow />
      </Plate>
    </Press>
  );
}

function SignOut() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
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
          onPress={async () => {
            setSigningOut(true);
            // The stored session is cleared before the request, so an unreachable Worker still signs out.
            await authClient.signOut().catch(() => undefined);
            // Nothing of this learner stays on the device for the next one, as on the web.
            dropQueued();
            queryClient.clear();
            setSigningOut(false);
          }}
        />
      </Rows>
    </View>
  );
}
