import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { usePathname, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Play } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDecks } from "../data/queries";
import { haptics } from "../theme/haptics";
import { usePalette } from "../theme/palette";
import { Text } from "./primitives";

export const DECK_ACCESSORY =
  Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

const hiddenDecks = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
export function setDeckReviewHidden(deckId: string, hidden: boolean) {
  if (hiddenDecks.has(deckId) === hidden) return;
  if (hidden) hiddenDecks.add(deckId);
  else hiddenDecks.delete(deckId);
  version++;
  for (const l of listeners) l();
}
const selectingDecks = new Set<string>();
export function setDeckSelecting(deckId: string, selecting: boolean) {
  if (selectingDecks.has(deckId) === selecting) return;
  if (selecting) selectingDecks.add(deckId);
  else selectingDecks.delete(deckId);
  version++;
  for (const l of listeners) l();
}
function useDeckReviewRides(deckId: string | undefined) {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return !!deckId && hiddenDecks.has(deckId) && !selectingDecks.has(deckId);
}

export function useDeckAccessoryShown() {
  const deckId = usePathname().match(/^\/library\/([^/]+)$/)?.[1];
  const due = useDecks().data?.find((d) => d.id === deckId)?.due ?? 0;
  const rides = useDeckReviewRides(deckId);
  return DECK_ACCESSORY && !!deckId && due > 0 && rides;
}

const ANDROID = Platform.OS === "android";
const TAB_BAR = ANDROID ? 80 : 49;
const ACCESSORY = 56;
const TABS = /^\/(today|library|explore|you)(\/|$)/;

export function useAboveTabBar() {
  const insets = useSafeAreaInsets();
  const onTab = TABS.test(usePathname());
  const accessory = useDeckAccessoryShown() ? ACCESSORY : 0;
  return insets.bottom + (onTab ? TAB_BAR + accessory : 0);
}

export function TabBar() {
  const p = usePalette();
  const { t } = useLingui();
  const deckId = usePathname().match(/^\/library\/([^/]+)$/)?.[1];
  const due = useDecks().data?.find((d) => d.id === deckId)?.due ?? 0;
  const accessory = useDeckAccessoryShown();
  const label = { fontFamily: "Onest", fontWeight: "500", fontSize: ANDROID ? 12 : 10 } as const;
  return (
    <NativeTabs
      labelStyle={{
        default: { ...label, color: p["ink-muted"] },
        selected: { ...label, color: p["amber-text"] },
      }}
      iconColor={{ default: p["ink-muted"], selected: p["amber-mark"] }}
      tintColor={p["amber-mark"]}
      minimizeBehavior="onScrollDown"
      {...(ANDROID && {
        backgroundColor: p.rail,
        indicatorColor: p["rail-chosen"],
        rippleColor: p["glass-veil"],
        labelVisibilityMode: "labeled",
      })}
    >
      {accessory && deckId && (
        <NativeTabs.BottomAccessory>
          <MiniPlayer deckId={deckId} due={due} />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon
          src={{
            default: require("../../assets/tabs/today.png"),
            selected: require("../../assets/tabs/today-filled.png"),
          }}
        />
        <NativeTabs.Trigger.Label>{t`Today`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon
          src={{
            default: require("../../assets/tabs/library.png"),
            selected: require("../../assets/tabs/library-filled.png"),
          }}
        />
        <NativeTabs.Trigger.Label>{t`Library`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon
          src={{
            default: require("../../assets/tabs/explore.png"),
            selected: require("../../assets/tabs/explore-filled.png"),
          }}
        />
        <NativeTabs.Trigger.Label>{t`Explore`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Icon
          src={{
            default: require("../../assets/tabs/you.png"),
            selected: require("../../assets/tabs/you-filled.png"),
          }}
        />
        <NativeTabs.Trigger.Label>{t`You`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function MiniPlayer({ deckId, due }: { deckId: string; due: number }) {
  const p = usePalette();
  const { t } = useLingui();
  const router = useRouter();
  const inline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const review = () => {
    haptics.start();
    router.push(`/review?deck=${deckId}`);
  };
  return (
    <Pressable
      onPress={review}
      accessibilityRole="button"
      accessibilityLabel={t`Review ${plural(due, { one: "# card", other: "# cards" })}`}
      className="flex-1 flex-row items-center gap-3 ps-2 pe-1.5"
    >
      <View
        className={`${inline ? "size-7" : "size-9"} items-center justify-center rounded-full bg-amber-soft`}
      >
        <Text
          className="text-sm font-semibold text-amber-text"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {due}
        </Text>
      </View>
      <Text className="flex-1 text-base font-medium text-ink" numberOfLines={1}>
        {plural(due, { one: "card to review", other: "cards to review" })}
      </Text>
      <View className="size-10 items-center justify-center">
        <Play size={20} color={p.ink} fill={p.ink} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
