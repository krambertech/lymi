import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Play } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDecks } from "../data/queries";
import { usePalette } from "../theme/palette";
import { Text } from "./primitives";

/** iOS gives a tab bar an accessory from iOS 26; elsewhere a deck keeps its own Review button. */
export const DECK_ACCESSORY =
  Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

// The decks whose own Review button has scrolled out of sight; the accessory waits for it. Kept per
// deck, since a second deck page can be pushed over a scrolled one.
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
function useDeckReviewHidden(deckId: string | undefined) {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return !!deckId && hiddenDecks.has(deckId);
}

/** Whether the bar carries a deck's review accessory now, so what floats above the bar clears it. */
export function useDeckAccessoryShown() {
  const deckId = usePathname().match(/^\/library\/([^/]+)$/)?.[1];
  const due = useDecks().data?.find((d) => d.id === deckId)?.due ?? 0;
  const hidden = useDeckReviewHidden(deckId);
  return DECK_ACCESSORY && !!deckId && due > 0 && hidden;
}

// iOS 26's floating tab bar and the accessory a deck's review rides in.
const TAB_BAR = 64;
const ACCESSORY = 56;
const TABS = /^\/(today|library|explore|you)(\/|$)/;

/** How far above the screen's bottom something floating sits to clear the tab bar and its accessory. */
export function useAboveTabBar() {
  const insets = useSafeAreaInsets();
  const onTab = TABS.test(usePathname());
  const accessory = useDeckAccessoryShown() ? ACCESSORY : 0;
  return insets.bottom + (onTab ? TAB_BAR + accessory : 0);
}

/**
 * The phone's tabs are iOS's own tab bar, so the lens and the press are Apple's Liquid Glass, in
 * Onest with Lucide icons. Inside a deck with cards due, once the deck's own Review button has
 * scrolled away, its review rides in the bar's accessory, as Podcasts shows what is playing.
 * phone.md "Navigation".
 */
export function TabBar() {
  const p = usePalette();
  const { t } = useLingui();
  const deckId = usePathname().match(/^\/library\/([^/]+)$/)?.[1];
  const due = useDecks().data?.find((d) => d.id === deckId)?.due ?? 0;
  const accessory = useDeckAccessoryShown();
  const label = { fontFamily: "Onest", fontWeight: "500", fontSize: 10 } as const;
  return (
    <NativeTabs
      labelStyle={{ default: { ...label, color: p.muted }, selected: { ...label, color: p.text } }}
      iconColor={{ default: p.muted, selected: p.text }}
      tintColor={p.text}
      minimizeBehavior="onScrollDown"
    >
      {accessory && deckId && (
        <NativeTabs.BottomAccessory>
          <MiniPlayer deckId={deckId} due={due} />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon src={require("../../assets/tabs/today.png")} />
        <NativeTabs.Trigger.Label>{t`Today`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon src={require("../../assets/tabs/library.png")} />
        <NativeTabs.Trigger.Label>{t`Library`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon src={require("../../assets/tabs/explore.png")} />
        <NativeTabs.Trigger.Label>{t`Explore`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Icon src={require("../../assets/tabs/you.png")} />
        <NativeTabs.Trigger.Label>{t`You`}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** What the open deck has due, as Podcasts shows what is playing: the count, and Review. */
function MiniPlayer({ deckId, due }: { deckId: string; due: number }) {
  const p = usePalette();
  const { t } = useLingui();
  const router = useRouter();
  const inline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const review = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <Text className="flex-1 text-base font-medium text-text" numberOfLines={1}>
        {plural(due, { one: "card to review", other: "cards to review" })}
      </Text>
      <View className="size-10 items-center justify-center">
        <Play size={20} color={p.text} fill={p.text} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
