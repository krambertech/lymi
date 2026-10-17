import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type Href, usePathname, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Play } from "lucide-react-native";
import { useSyncExternalStore } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDecks } from "../data/queries";
import { haptics } from "../theme/haptics";
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
// The decks whose list is choosing cards: their selection bar owns the space, so no review rides there.
const selectingDecks = new Set<string>();
export function setDeckSelecting(deckId: string, selecting: boolean) {
  if (selectingDecks.has(deckId) === selecting) return;
  if (selecting) selectingDecks.add(deckId);
  else selectingDecks.delete(deckId);
  version++;
  for (const l of listeners) l();
}
/** What a filtered deck page has due, and where its review opens. */
export interface DeckView {
  due: number;
  href: Href;
}
// The decks whose list is filtered: while it is, the accessory reviews what the filters show, and
// null says they show nothing to review.
const deckViews = new Map<string, DeckView | null>();
/** A filtered list's review, null while it has nothing due, or undefined once it is not filtered. */
export function setDeckView(deckId: string, view: DeckView | null | undefined) {
  const was = deckViews.get(deckId);
  if (
    deckViews.has(deckId) === (view !== undefined) &&
    was?.due === view?.due &&
    was?.href === view?.href
  )
    return;
  if (view === undefined) deckViews.delete(deckId);
  else deckViews.set(deckId, view);
  version++;
  for (const l of listeners) l();
}
function useDeckRide(deckId: string | undefined) {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  const rides = !!deckId && hiddenDecks.has(deckId) && !selectingDecks.has(deckId);
  const filtered = !!deckId && deckViews.has(deckId);
  const view = deckId && !selectingDecks.has(deckId) ? (deckViews.get(deckId) ?? null) : null;
  return { rides, filtered, view };
}

type Ride = { deckId: string; due: number } | { deckId: string; view: DeckView };

/** What the bar's accessory reviews now: the deck's due cards, the filtered ones, or nothing. */
function useDeckRideNow(): Ride | null {
  const deckId = usePathname().match(/^\/library\/([^/]+)$/)?.[1];
  const due = useDecks().data?.find((d) => d.id === deckId)?.due ?? 0;
  const { rides, filtered, view } = useDeckRide(deckId);
  if (!DECK_ACCESSORY || !deckId) return null;
  // A filtered list's review is the one in view, even before the deck's Review scrolls away.
  if (filtered) return view && view.due > 0 ? { deckId, view } : null;
  return due > 0 && rides ? { deckId, due } : null;
}

/** Whether the bar carries a deck's review accessory now, so what floats above the bar clears it. */
export function useDeckAccessoryShown() {
  return useDeckRideNow() !== null;
}

const ANDROID = Platform.OS === "android";
// The room iOS keeps for its tab bar over the home indicator's inset, and Material's 80 dp bar over the
// navigation bar's, which the floating bar sits in, and the accessory a deck's review rides in.
const TAB_BAR = ANDROID ? 80 : 49;
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
  const ride = useDeckRideNow();
  const label = { fontFamily: "Onest", fontWeight: "500", fontSize: ANDROID ? 12 : 10 } as const;
  return (
    <NativeTabs
      labelStyle={{ default: { ...label, color: p.muted }, selected: { ...label, color: p.text } }}
      iconColor={{ default: p.muted, selected: p.text }}
      tintColor={p.text}
      minimizeBehavior="onScrollDown"
      // Material's bar, in the web rail's colours rather than the wallpaper's: its pill is the chip
      // the rail puts under the current page.
      {...(ANDROID && {
        backgroundColor: p.rail,
        indicatorColor: p["rail-chosen"],
        rippleColor: p["glass-veil"],
        labelVisibilityMode: "labeled",
      })}
    >
      {ride && (
        <NativeTabs.BottomAccessory>
          {"view" in ride ? (
            <MiniPlayer due={ride.view.due} href={ride.view.href} filtered />
          ) : (
            <MiniPlayer due={ride.due} href={`/review?deck=${ride.deckId}`} />
          )}
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

/**
 * What the open deck has due, as Podcasts shows what is playing: the count, and Review. While the
 * list is filtered, it is what the filters show that is due.
 */
function MiniPlayer({
  due,
  href,
  filtered = false,
}: {
  due: number;
  href: Href;
  filtered?: boolean;
}) {
  const p = usePalette();
  const { t } = useLingui();
  const router = useRouter();
  const inline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const review = () => {
    haptics.start();
    router.push(href);
  };
  return (
    <Pressable
      onPress={review}
      accessibilityRole="button"
      accessibilityLabel={
        filtered
          ? plural(due, {
              one: "Review # filtered card",
              other: "Review # filtered cards",
            })
          : t`Review ${plural(due, { one: "# card", other: "# cards" })}`
      }
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
        {filtered
          ? plural(due, { one: "filtered card to review", other: "filtered cards to review" })
          : plural(due, { one: "card to review", other: "cards to review" })}
      </Text>
      <View className="size-10 items-center justify-center">
        <Play size={20} color={p.text} fill={p.text} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
