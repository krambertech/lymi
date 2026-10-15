import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { ApiError, api, refusalDetail } from "@lymi/client/api";
import { addPreviewQuery, exploreQuery, joinPreviewQuery } from "@lymi/client/queries";
import type { JoinPreviewOut } from "@lymi/core";
import { onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSession } from "../auth/client";
import { letGoOfLink, noteLink } from "../auth/held-link";
import { languageName } from "../data/languages";
import { DeckHand } from "../explore/deck-hand";
import { type TrayCard, useCoverColour } from "../explore/tray";
import { usePalette } from "../theme/palette";
import { EmptyState } from "../ui/empty-state";
import type { IconName } from "../ui/icons";
import { Button, Icon, Text } from "../ui/primitives";
import { Screen } from "../ui/screen";
import { Skeleton } from "../ui/skeleton";
import { promiseJoin, takeJoin } from "./join-intent";

/** A join link someone shared, or "Add to Lymi" on a published deck's public page. */
export type Arrival =
  | { kind: "link"; token: string }
  | { kind: "publication"; slug: string; edition: string | undefined };

class Offline extends Error {}

/**
 * A shared deck's link, opened in the app: whose deck it is, a few of its cards, and one button.
 * Signed out, the button signs in first and the link comes back to join. The web's join page.
 */
export function JoinScreen({ arrival }: { arrival: Arrival }) {
  const { t } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const signedIn = Boolean(useSession().data);
  const published = arrival.kind === "publication";
  const preview = useQuery(
    published ? addPreviewQuery(arrival.slug) : joinPreviewQuery(arrival.token),
  );
  const [failed, setFailed] = useState<string | null>(null);
  // An edition the deck is not published in is ignored, so an old link still adds the original.
  const edition =
    published && preview.data?.editions?.includes(arrival.edition ?? "")
      ? arrival.edition
      : undefined;

  const describe = (err: unknown) => {
    if (err instanceof Offline) {
      return published
        ? t`Adding a deck needs a connection. Connect and try again.`
        : t`Joining a deck needs a connection. Connect and try again.`;
    }
    if (err instanceof ApiError && err.status === 404) {
      return published
        ? t`This deck is no longer published.`
        : t`This join link stopped working. Ask the owner for a new one.`;
    }
    if (err instanceof ApiError && err.status === 403) {
      if (published) return t`You cannot add this deck.`;
      const invited = refusalDetail(err, "invitedEmail");
      return invited
        ? t`This invitation was sent to ${invited}. Sign in with that address to join.`
        : t`You cannot join this deck through this link.`;
    }
    return published
      ? t`Couldn’t add the deck. Check your connection and try again.`
      : t`Couldn’t join the deck. Check your connection and try again.`;
  };

  const open = (deckId: string) => router.replace(`/library/${deckId}` as Href);

  const join = useMutation({
    networkMode: "always",
    mutationFn: async () => {
      if (!onlineManager.isOnline()) throw new Offline();
      return published ? api.addPublishedDeck(arrival.slug, edition) : api.join(arrival.token);
    },
    onMutate: () => setFailed(null),
    onSuccess: async ({ deckId }) => {
      qc.removeQueries({ queryKey: ["queue"] });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["rounds"] }),
        published && qc.invalidateQueries({ queryKey: exploreQuery.queryKey }),
      ]);
      open(deckId);
    },
    onError: (err) => {
      setFailed(describe(err));
      void preview.refetch();
    },
  });

  const key = published ? `add:${arrival.slug}` : `link:${arrival.token}`;
  // Back from sign-in for this link: join at once, as the web does, rather than ask twice.
  const resumed = useRef(false);
  useEffect(() => {
    const viewer = preview.data?.viewer;
    if (resumed.current || !viewer || viewer === "signed-out") return;
    resumed.current = true;
    // Taken whoever signed in, so a promise never waits for a later visit to the same link.
    if (takeJoin(key) && viewer === "visitor") join.mutate();
  }, [key, preview.data?.viewer, join]);

  const signIn = () => {
    const path = published
      ? `/add/${encodeURIComponent(arrival.slug)}${edition ? `?${new URLSearchParams({ edition })}` : ""}`
      : `/join/${encodeURIComponent(arrival.token)}`;
    promiseJoin(key);
    // Held at the door, so the link opens again once the learner is in.
    noteLink(path);
    router.replace("/welcome");
  };

  const back = signedIn
    ? { label: t`Today`, to: "/today" as const }
    : { label: t`Lymi`, to: "/welcome" as const };

  if (preview.isError && !preview.data) {
    return (
      <Screen title={published ? t`Shared deck` : t`Join a deck`} back={back}>
        <EmptyState
          kind="failed"
          title={published ? t`Couldn’t open this deck` : t`Couldn’t open this link`}
          body={describe(preview.error)}
          action={{
            label: t`Try again`,
            onPress: () => void preview.refetch(),
            busy: preview.isFetching,
          }}
        />
      </Screen>
    );
  }
  if (!preview.data) {
    return (
      <Screen title="" back={back} header={<LoadingHeader />}>
        <View />
      </Screen>
    );
  }
  const data = preview.data;
  if (data.status !== "live" || !data.deck) {
    return (
      <Screen title="" back={back}>
        <DeadLink preview={data} published={published} onOpen={open} />
      </Screen>
    );
  }
  return (
    <LiveLink
      preview={data}
      deck={data.deck}
      published={published}
      back={back}
      busy={join.isPending}
      error={failed}
      onJoin={() => join.mutate()}
      onSignIn={signIn}
      onOpen={open}
    />
  );
}

/**
 * Signing in or out lands on the first screen open to the new session, which can be this one with
 * no link, so it passes the learner on to where they were going.
 */
export function LinkGone() {
  const signedIn = Boolean(useSession().data);
  return <Redirect href={signedIn ? "/today" : "/welcome"} />;
}

function LoadingHeader() {
  return (
    <View className="items-center gap-4 pt-2">
      <Skeleton width={200} height={150} />
      <Skeleton width={220} height={28} />
      <Skeleton height={48} />
    </View>
  );
}

function LiveLink({
  preview,
  deck,
  published,
  back,
  busy,
  error,
  onJoin,
  onSignIn,
  onOpen,
}: {
  preview: JoinPreviewOut;
  deck: NonNullable<JoinPreviewOut["deck"]>;
  published: boolean;
  back: { label: string; to: Href };
  busy: boolean;
  error: string | null;
  onJoin: () => void;
  onSignIn: () => void;
  onOpen: (deckId: string) => void;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const { viewer, deckId } = preview;
  const ground = useCoverColour(deck.name);
  // The server draws the cards at random, so a refetch must not swap the hand mid-look.
  const [hand] = useState<TrayCard[]>(() =>
    deck.samples
      .filter((card) => card.meaning)
      .slice(0, 3)
      .map((card) => ({
        term: card.term,
        meaning: card.meaning ?? "",
        section: null,
        mode: "term_to_meaning",
      })),
  );
  const cards = plural(deck.total, { one: "# card", other: "# cards" });
  const language = deck.language ? languageName(deck.language) : null;
  const newcomer = viewer === "signed-out" || viewer === "visitor";

  const byline =
    viewer === "owner"
      ? t`Your deck`
      : published
        ? t`From ${deck.owner.name}`
        : t`${deck.owner.name} shared a deck`;

  const note =
    viewer === "owner"
      ? published
        ? t`Anyone can add this deck from its public page.`
        : t`Anyone with this link can join and review these cards.`
      : viewer === "member"
        ? published
          ? t`This deck is already in Library.`
          : t`You are already in this deck.`
        : viewer === "removed"
          ? published
            ? t`You were removed from this deck, so you cannot add it again. Your reviews are kept.`
            : t`You were removed from this deck, so this link cannot add you back. Your reviews are kept.`
          : null;

  const action = deckId ? (
    <Button label={t`Open deck`} variant="primary" size="lg" onPress={() => onOpen(deckId)} />
  ) : viewer === "signed-out" ? (
    <Button
      label={published ? t`Sign in to add` : t`Sign in to join`}
      variant="primary"
      size="lg"
      onPress={onSignIn}
    />
  ) : viewer === "visitor" ? (
    <Button
      label={published ? t`Add to Library` : t`Join`}
      variant="primary"
      size="lg"
      icon={published ? "plus" : "joined"}
      loading={busy}
      onPress={onJoin}
    />
  ) : (
    <Button label={t`Go to Today`} size="lg" onPress={() => router.replace("/today")} />
  );

  const header = (
    <View className="items-center gap-5">
      {hand.length > 0 && <DeckHand cards={hand} gathered={false} ground={ground} />}
      <View className="items-center gap-2.5">
        <Text className="text-sm text-text-2">{byline}</Text>
        <Text
          className="text-center text-2xl font-medium tracking-tight text-text"
          accessibilityRole="header"
        >
          {deck.name}
        </Text>
        <Text className="text-center text-sm text-muted">
          {language ? t`${language} · ${cards}` : cards}
        </Text>
      </View>
      <View className="gap-3 self-stretch">
        {note && <Note tone={viewer === "member" ? "good" : "neutral"}>{note}</Note>}
        {error && <Note tone="danger">{error}</Note>}
        {action}
      </View>
    </View>
  );

  return (
    <Screen
      title={deck.name}
      back={back}
      ground={{ colour: ground, shape: "fade" }}
      header={header}
    >
      {newcomer && (
        <View className="gap-3 px-1">
          <Assurance icon="reviewedDays">
            {t`Review on your own schedule. New cards appear as they are added.`}
          </Assurance>
          <Assurance icon="hide">{t`Only your name is shared, never your progress.`}</Assurance>
        </View>
      )}
    </Screen>
  );
}

function Assurance({ icon, children }: { icon: IconName; children: string }) {
  const p = usePalette();
  return (
    <View className="flex-row items-start gap-3">
      <View className="pt-0.5">
        <Icon name={icon} size={18} colour={p.muted} />
      </View>
      <Text className="flex-1 text-base text-text-2">{children}</Text>
    </View>
  );
}

function Note({ tone, children }: { tone: "neutral" | "good" | "danger"; children: string }) {
  const p = usePalette();
  const look = {
    neutral: { box: "bg-plate-2", icon: "alert" as const, ink: p["text-2"] },
    good: { box: "bg-good-soft", icon: "check" as const, ink: p.good },
    danger: { box: "bg-danger-soft", icon: "alert" as const, ink: p.danger },
  }[tone];
  return (
    <View
      className={`flex-row items-start gap-2.5 rounded-md px-3.5 py-3 ${look.box}`}
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
    >
      <View className="pt-0.5">
        <Icon name={look.icon} size={16} colour={look.ink} />
      </View>
      <Text className="flex-1 text-base text-text">{children}</Text>
    </View>
  );
}

function DeadLink({
  preview,
  published,
  onOpen,
}: {
  preview: JoinPreviewOut;
  published: boolean;
  onOpen: (deckId: string) => void;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const signedIn = Boolean(useSession().data);
  const { status, deckId } = preview;
  const title = published
    ? status === "off"
      ? t`This deck is no longer published`
      : status === "archived"
        ? t`This deck is archived`
        : t`There is no deck at this address`
    : status === "off"
      ? t`This join link is turned off`
      : status === "archived"
        ? t`This deck is archived`
        : t`This join link does not work`;
  const line = published
    ? status === "off"
      ? t`Nobody new can add it.`
      : status === "archived"
        ? t`Nobody can add it while it is archived.`
        : t`Check that the whole link was copied.`
    : status === "off"
      ? t`Ask the person who shared it for a new link.`
      : status === "archived"
        ? t`Nobody can join it while it is archived.`
        : t`Check that the whole link was copied, or ask for a new one.`;
  return (
    <EmptyState
      kind="start"
      icon={status === "off" ? "linkOff" : status === "archived" ? "archive" : "noMatch"}
      title={title}
      body={deckId ? `${line} ${t`You are still in the deck.`}` : line}
      action={
        deckId
          ? { label: t`Open deck`, onPress: () => onOpen(deckId) }
          : signedIn
            ? { label: t`Go to Today`, onPress: () => router.replace("/today") }
            : {
                label: t`Go to Lymi`,
                onPress: () => {
                  // Otherwise the door holds this link and reopens it after sign-in.
                  letGoOfLink();
                  router.replace("/welcome");
                },
              }
      }
    />
  );
}
