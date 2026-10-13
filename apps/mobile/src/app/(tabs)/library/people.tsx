import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  ApiError,
  api,
  errorMessage,
  type Invitation,
  type Member,
  refusalDetail,
} from "@lymi/client/api";
import { invitationsQuery, joinLinkQuery, membersQuery } from "@lymi/client/queries";
import { type InviteRefusal, PENDING_INVITATION_LIMIT } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams } from "expo-router";
import { type ReactNode, useState } from "react";
import { Alert, Platform, Share, TextInput, View } from "react-native";
import { useDecks } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { inputCap } from "../../../theme/type";
import { Chip } from "../../../ui/chip";
import { Icon } from "../../../ui/icons";
import { DropdownMenu } from "../../../ui/menu";
import { Button, IconButton, Plate, Press, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { Sheet, SheetError } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";

/**
 * People and sharing, as the web's deck settings hold them: everyone studying the deck with who
 * has not joined yet, Invite, and who else can join, private or anyone with the link. Invitations
 * work whichever is chosen.
 */
export default function People() {
  const { t, i18n } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const qc = useQueryClient();
  const members = useQuery({ ...membersQuery(id), enabled: !!id });
  const invitations = useQuery({ ...invitationsQuery(id), enabled: !!id });
  const joinLink = useQuery({ ...joinLinkQuery(id), enabled: !!id });
  const [inviting, setInviting] = useState(false);

  const after = (...keys: string[][]) =>
    Promise.all([...keys, ["activity"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const failed = (title: string) => (e: unknown) => Alert.alert(title, errorMessage(e));

  const invite = useMutation({
    mutationFn: (email: string) => api.invite(id, email),
    onSuccess: async () => {
      setInviting(false);
      await after(["decks", id, "invitations"]);
    },
  });
  const cancelInvite = useMutation({
    mutationFn: (invitation: Invitation) => api.cancelInvitation(id, invitation.id),
    onSuccess: () => after(["decks", id, "invitations"]),
    onError: failed(t`Couldn’t cancel the invitation. Try again.`),
  });
  const remove = useMutation({
    mutationFn: (member: Member) => api.removeMember(id, member.userId),
    onSuccess: () => after(["decks", id, "members"], ["decks", id, "join-link"]),
    onError: failed(t`Couldn’t remove them. Try again.`),
  });
  const turnOn = useMutation({
    mutationFn: () => api.turnOnJoinLink(id),
    onSuccess: (value) => {
      qc.setQueryData(joinLinkQuery(id).queryKey, value);
      void after();
    },
    onError: failed(t`Couldn’t turn on the join link. Try again.`),
  });
  const turnOff = useMutation({
    mutationFn: () => api.turnOffJoinLink(id),
    onSuccess: () => {
      qc.setQueryData(joinLinkQuery(id).queryKey, (prev) => ({
        link: null,
        members: prev?.members ?? 0,
      }));
      void after();
    },
    onError: failed(t`Couldn’t turn off the join link. Try again.`),
  });

  // The server's reason is English and for integrations; the owner reads it in their language.
  const inviteRefusal = (error: unknown): string => {
    switch (refusalDetail(error, "reason") as InviteRefusal | null) {
      case "owner":
        return t`This deck is already yours.`;
      case "member":
        return t`They’re already in this deck.`;
      case "removed":
        return t`You removed them from this deck, so you can’t invite them again.`;
      case "invited":
        return t`They already have a pending invitation.`;
      case "full":
        return plural(PENDING_INVITATION_LIMIT, {
          one: "You already have # pending invitation. Cancel it, or wait for them to join.",
          other: "You already have # pending invitations. Cancel one, or wait for someone to join.",
        });
    }
    if (error instanceof ApiError && error.status === 429) {
      return t`Couldn’t send the invitation. Too many went out recently, so try again later.`;
    }
    return errorMessage(error);
  };

  const askRemove = (member: Member) => {
    const name = member.name;
    Alert.alert(
      t`Remove ${name}?`,
      t`They lose this deck and can’t rejoin, by link or invitation. Their reviews are kept.`,
      [
        { text: t`Keep member`, style: "cancel" },
        { text: t`Remove member`, style: "destructive", onPress: () => remove.mutate(member) },
      ],
    );
  };
  const askCancel = (invitation: Invitation) => {
    const email = invitation.email;
    Alert.alert(
      t`Cancel the invitation to ${email}?`,
      t`Their invitation link stops working. You can invite them again any time.`,
      [
        { text: t`Keep invitation`, style: "cancel" },
        {
          text: t`Cancel invitation`,
          style: "destructive",
          onPress: () => cancelInvite.mutate(invitation),
        },
      ],
    );
  };
  const askTurnOff = () =>
    Alert.alert(
      t`Turn off the join link?`,
      t`The link stops working for good. People who joined stay in the deck, and sharing again makes a new link.`,
      [
        { text: t`Keep sharing`, style: "cancel" },
        { text: t`Turn off link`, style: "destructive", onPress: () => turnOff.mutate() },
      ],
    );

  const link = joinLink.data?.link;
  const shared = !!link || turnOn.isPending;
  const back = { label: t`Deck settings`, to: `/library/deck-settings?id=${id}` as Href };
  const loading = !members.data || !invitations.data;
  const dayMonth = (date: Date) => i18n.date(date, { day: "numeric", month: "short" });

  return (
    <Screen title={t`People and sharing`} back={back}>
      <View className="gap-2">
        <Text className="px-1 text-lg font-medium text-text" accessibilityRole="header">
          {t`People`}
        </Text>
        <Text className="px-1 text-base text-text-2">
          {t`Everyone studying this deck. You see whether they joined, not their reviews.`}
        </Text>
      </View>
      {loading ? (
        <Skeleton height={120} />
      ) : (
        <Plate className="overflow-hidden">
          <PersonRow
            first
            name={deck?.owner.name ?? ""}
            end={
              <View className="pe-2">
                <Chip size="sm">{t`Owner`}</Chip>
              </View>
            }
          />
          {members.data.map((member) => {
            const joined = new Date(member.joinedAt);
            const name = member.name;
            return (
              <PersonRow
                key={member.userId}
                name={name}
                line={t`joined ${dayMonth(joined)}`}
                end={
                  <DropdownMenu
                    title={name}
                    items={[
                      {
                        label: t`Remove from deck`,
                        icon: "left",
                        destructive: true,
                        onSelect: () => askRemove(member),
                      },
                    ]}
                    trigger={(open) => (
                      <IconButton
                        icon="more"
                        size="sm"
                        label={t`Options for ${name}`}
                        disabled={remove.isPending && remove.variables?.userId === member.userId}
                        onPress={open}
                      />
                    )}
                  />
                }
              />
            );
          })}
          {invitations.data.map((invitation) => {
            const email = invitation.email;
            return (
              <PersonRow
                key={invitation.id}
                name={email}
                pending
                line={t`invited ${dayMonth(new Date(invitation.invitedAt))}`}
                end={
                  <View className="flex-row items-center gap-1">
                    <Chip size="sm">{t`Not joined yet`}</Chip>
                    <DropdownMenu
                      title={email}
                      items={[
                        {
                          label: t`Cancel invitation`,
                          icon: "uninvite",
                          destructive: true,
                          onSelect: () => askCancel(invitation),
                        },
                      ]}
                      trigger={(open) => (
                        <IconButton
                          icon="more"
                          size="sm"
                          label={t`Options for ${email}`}
                          disabled={
                            cancelInvite.isPending && cancelInvite.variables?.id === invitation.id
                          }
                          onPress={open}
                        />
                      )}
                    />
                  </View>
                }
              />
            );
          })}
        </Plate>
      )}
      <Button label={t`Invite`} icon="joined" onPress={() => setInviting(true)} />

      <View className="gap-2">
        <Text className="px-1 text-lg font-medium text-text" accessibilityRole="header">
          {t`Who can join`}
        </Text>
        {joinLink.isError ? (
          <Text className="px-1 text-base text-danger">
            {t`Couldn’t load the join link. Try again.`}
          </Text>
        ) : !joinLink.data ? (
          <Skeleton height={140} />
        ) : (
          <Plate className="overflow-hidden">
            <Choice
              title={t`Private`}
              line={t`Only people you invite can join. Current members stay.`}
              chosen={!shared}
              onPress={() => shared && !turnOff.isPending && askTurnOff()}
            />
            <Choice
              title={t`Anyone with the link`}
              line={t`Anyone with the link can join and review your cards on their own schedule. They cannot change the cards, and you do not see their progress.`}
              chosen={shared}
              onPress={() => !shared && turnOn.mutate()}
              divided
            />
            {shared && (
              <View className="gap-3 px-4 pb-4 ps-12">
                {link ? (
                  <View className="rounded-md bg-plate-2 px-3 py-2.5">
                    <Text className="text-base text-text" numberOfLines={1} selectable>
                      {link.url}
                    </Text>
                  </View>
                ) : (
                  <Skeleton height={44} />
                )}
                {link && (
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label={t`Share link`}
                      icon="share"
                      onPress={() =>
                        // iOS shows both a url and a message, so the link would appear twice.
                        void Share.share(
                          Platform.OS === "ios"
                            ? { url: link.url, title: deck?.name }
                            : { message: link.url, title: deck?.name },
                        )
                      }
                    />
                    <Button
                      label={t`Turn off link`}
                      icon="linkOff"
                      loading={turnOff.isPending}
                      onPress={askTurnOff}
                    />
                  </View>
                )}
              </View>
            )}
          </Plate>
        )}
      </View>

      <InviteSheet
        open={inviting}
        onClose={() => {
          setInviting(false);
          invite.reset();
        }}
        busy={invite.isPending}
        error={invite.isError ? inviteRefusal(invite.error) : null}
        onChange={() => invite.isError && invite.reset()}
        onInvite={(email) => invite.mutate(email)}
      />
    </Screen>
  );
}

function PersonRow({
  name,
  line,
  end,
  first = false,
  pending = false,
}: {
  name: string;
  line?: string;
  end?: ReactNode;
  first?: boolean;
  /** Invited and not joined yet: a dashed mark, as the web draws it. */
  pending?: boolean;
}) {
  return (
    <View
      className={`min-h-16 flex-row items-center gap-3 py-3 pe-2 ps-4 ${first ? "" : "border-t border-edge"}`}
    >
      <View
        className={`size-9 items-center justify-center rounded-full ${pending ? "border border-dashed border-edge-2" : "bg-plate-2"}`}
      >
        <Text className={`text-sm font-medium ${pending ? "text-faint" : "text-text-2"}`}>
          {initial(name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-md font-medium text-text" numberOfLines={1}>
          {name}
        </Text>
        {line && (
          <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {line}
          </Text>
        )}
      </View>
      {end}
    </View>
  );
}

/** The first character, by code point, so an emoji or an accented letter is not cut in half. */
function initial(name: string) {
  return (Array.from(name.trim())[0] ?? "").toUpperCase();
}

function Choice({
  title,
  line,
  chosen,
  onPress,
  divided = false,
}: {
  title: string;
  line: string;
  chosen: boolean;
  onPress: () => void;
  divided?: boolean;
}) {
  const p = usePalette();
  return (
    <Press
      scale={0.99}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      className={`flex-row gap-3 px-4 py-3.5 ${divided ? "border-t border-edge" : ""}`}
    >
      <View className="w-5 pt-0.5">
        {chosen && <Icon name="check" size={20} colour={p.text} strokeWidth={2.25} />}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-md font-medium text-text">{title}</Text>
        <Text className="text-sm text-text-2">{line}</Text>
      </View>
    </Press>
  );
}

/** One field: an address. The sheet closes only once the invitation lands. */
function InviteSheet({
  open,
  onClose,
  onInvite,
  onChange,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string) => void;
  onChange: () => void;
  busy: boolean;
  error: string | null;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const [email, setEmail] = useState("");
  const [refused, setRefused] = useState<string | null>(null);
  const [was, setWas] = useState(open);
  if (open !== was) {
    setWas(open);
    if (open) {
      setEmail("");
      setRefused(null);
    }
  }
  const submit = () => {
    if (busy) return;
    const value = email.trim();
    if (!value) return setRefused(t`Enter an email address.`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return setRefused(t`Enter a full email address, like anna@example.com.`);
    }
    onInvite(value);
  };
  const shown = refused ?? error;
  return (
    <Sheet
      title={t`Invite by email`}
      description={t`They get an email with a link only they can use. They can study the deck but not change it.`}
      save={{ label: t`Send invitation`, onPress: submit, busy, disabled: !email.trim() }}
      open={open}
      onOpenChange={(next) => !next && onClose()}
    >
      <View className="rounded-xl bg-glass-plate px-4">
        <TextInput
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            setRefused(null);
            onChange();
          }}
          autoFocus
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="send"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder={t`anna@example.com`}
          placeholderTextColor={p.muted}
          accessibilityLabel={t`Email address`}
          selectionColor={p.text}
          className="min-h-11 py-2 font-sans text-text"
          style={{ fontSize: 17 }}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </View>
      {shown && <SheetError>{shown}</SheetError>}
    </Sheet>
  );
}
