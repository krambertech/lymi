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
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Share,
  TextInput,
  type TurboModule,
  TurboModuleRegistry,
  View,
} from "react-native";
import { useDecks } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { ActionMenu } from "../ui/action-menu";
import { Chip } from "../ui/chip";
import { FormHeader } from "../ui/form-header";
import { useFrost } from "../ui/glass";
import { Icon, type IconName } from "../ui/icons";
import { LoadFailed, useLoadFailed } from "../ui/load-failed";
import { Press, Text } from "../ui/primitives";
import { SheetError, SheetGroup, SheetHeading, SheetNote, SheetRow } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { OnGlass } from "../ui/surface";

// React Native still ships its clipboard natively; importing `Clipboard` from it only adds a warning that it moved.
const clipboard = TurboModuleRegistry.get<TurboModule & { setString(content: string): void }>(
  "Clipboard",
);

const WHOLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Share deck, the owner's one place for sharing: People first, the invite field over everyone
 * studying the deck and who has not joined yet, then who else can join with the join link under it.
 * Invitations work whichever is chosen.
 */
export default function ShareDeck() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const frost = useFrost();
  const online = useOnline();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const qc = useQueryClient();
  const members = useQuery({ ...membersQuery(id), enabled: !!id });
  const invitations = useQuery({ ...invitationsQuery(id), enabled: !!id });
  const joinLink = useQuery({ ...joinLinkQuery(id), enabled: !!id });
  const membersFailed = useLoadFailed(members);
  const invitationsFailed = useLoadFailed(invitations);
  const linkFailed = useLoadFailed(joinLink);
  const [draft, setDraft] = useState("");
  const [refused, setRefused] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const done = setTimeout(() => setSent(null), 5000);
    return () => clearTimeout(done);
  }, [sent]);
  useEffect(() => {
    if (!copied) return;
    const done = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(done);
  }, [copied]);

  const after = (...keys: string[][]) =>
    Promise.all([...keys, ["activity"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const failed = (title: string) => (e: unknown) => Alert.alert(title, errorMessage(e));
  const sentTo = (email: string) => t`Invitation sent to ${email}.`;

  const invite = useMutation({
    mutationFn: (email: string) => api.invite(id, email),
    onSuccess: async (_, email) => {
      setDraft("");
      setSent(email);
      AccessibilityInfo.announceForAccessibility(sentTo(email));
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

  const submit = () => {
    if (invite.isPending || !online) return;
    const value = draft.trim();
    if (!value) return setRefused(t`Enter an email address.`);
    if (!WHOLE_EMAIL.test(value)) {
      return setRefused(t`Enter a full email address, like anna@example.com.`);
    }
    setSent(null);
    invite.mutate(value);
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
      t`The link stops working for good. People who joined stay.`,
      [
        { text: t`Keep link`, style: "cancel" },
        { text: t`Turn off link`, style: "destructive", onPress: () => turnOff.mutate() },
      ],
    );

  const link = joinLink.data?.link;
  const shared = !!link || turnOn.isPending;
  const waiting = invitations.data?.length ?? 0;
  const full = waiting >= PENDING_INVITATION_LIMIT;
  const whole = WHOLE_EMAIL.test(draft.trim());
  const ready = whole && online && !invite.isPending;
  const error = refused ?? (invite.isError ? inviteRefusal(invite.error) : null);
  const dayMonth = (date: Date) => i18n.date(date, { day: "numeric", month: "short" });

  return (
    <OnGlass>
      <FormHeader
        close={{ label: t`Close`, onPress: () => router.back() }}
        title={t`Share deck`}
        style={{ backgroundColor: frost }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: frost }}
        contentContainerClassName="gap-3 px-4 pt-2 pb-12"
      >
        <SheetHeading>{t`People`}</SheetHeading>
        {full ? (
          <Text className="px-4 text-base text-text-2">
            {plural(waiting, {
              one: "# invitation is waiting. Cancel it to invite someone else.",
              other: "# invitations are waiting. Cancel one to invite someone else.",
            })}
          </Text>
        ) : (
          <View className="gap-2">
            <View
              className={`min-h-[52px] flex-row items-center gap-2.5 rounded-2xl bg-glass-plate ps-3.5 pe-1.5 ${online ? "" : "opacity-45"}`}
            >
              <Icon name="email" size={18} colour={p.muted} />
              <TextInput
                value={draft}
                onChangeText={(next) => {
                  setDraft(next);
                  setRefused(null);
                  if (invite.isError) invite.reset();
                }}
                editable={online}
                onSubmitEditing={submit}
                submitBehavior="submit"
                returnKeyType="send"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                placeholder={t`Email address`}
                placeholderTextColor={p.muted}
                accessibilityLabel={t`Email address`}
                selectionColor={p.text}
                className="min-h-11 flex-1 py-2 font-sans text-text"
                style={{ fontSize: 17 }}
                maxFontSizeMultiplier={inputCap(17)}
              />
              <Press
                onPress={submit}
                disabled={!online || invite.isPending}
                accessibilityRole="button"
                accessibilityLabel={t`Invite`}
                accessibilityState={{ disabled: !online, busy: invite.isPending }}
                className={`min-h-10 min-w-[76px] py-2 items-center justify-center rounded-xl px-4 ${ready ? "bg-amber" : "bg-plate-2"}`}
              >
                {invite.isPending ? (
                  <ActivityIndicator size="small" color={p.muted} />
                ) : (
                  <Text
                    className="text-md font-semibold"
                    style={{ color: ready ? p["amber-ink"] : p.faint }}
                  >
                    {t`Invite`}
                  </Text>
                )}
              </Press>
            </View>
            {error ? (
              <SheetError>{error}</SheetError>
            ) : (
              <Text className="px-4 text-sm text-text-2">
                {!online
                  ? t`Inviting needs a connection.`
                  : sent
                    ? sentTo(sent)
                    : t`They get an email with a link only they can use.`}
              </Text>
            )}
          </View>
        )}

        {membersFailed || invitationsFailed ? (
          <SheetGroup>
            <LoadFailed
              query={membersFailed ? members : invitations}
              failed={t`Couldn’t load who’s in this deck`}
              offline={t`Who’s in this deck needs a connection`}
              size="inline"
            />
          </SheetGroup>
        ) : !members.data || !invitations.data ? (
          <Skeleton height={120} />
        ) : (
          <>
            <SheetGroup>
              <PersonRow
                name={deck?.owner.name ?? ""}
                line={t`You`}
                end={
                  <View className="pe-1">
                    <Chip size="sm">{t`Owner`}</Chip>
                  </View>
                }
              />
              {members.data.map((member) => {
                const name = member.name;
                const joined = dayMonth(new Date(member.joinedAt));
                return (
                  <PersonRow
                    key={member.userId}
                    name={name}
                    line={t`Joined ${joined}`}
                    end={
                      <ActionMenu
                        items={[
                          {
                            label: t`Remove from deck`,
                            icon: "left",
                            destructive: true,
                            onSelect: () => askRemove(member),
                          },
                        ]}
                        label={t`Options for ${name}`}
                        symbol="ellipsis"
                        look="row"
                        disabled={remove.isPending && remove.variables?.userId === member.userId}
                      />
                    }
                  />
                );
              })}
              {invitations.data.map((invitation) => {
                const email = invitation.email;
                const invited = dayMonth(new Date(invitation.invitedAt));
                return (
                  <PersonRow
                    key={invitation.id}
                    name={email}
                    pending
                    line={t`Not joined yet · invited ${invited}`}
                    end={
                      <ActionMenu
                        items={[
                          {
                            label: t`Cancel invitation`,
                            icon: "uninvite",
                            destructive: true,
                            onSelect: () => askCancel(invitation),
                          },
                        ]}
                        label={t`Options for ${email}`}
                        symbol="ellipsis"
                        look="row"
                        disabled={
                          cancelInvite.isPending && cancelInvite.variables?.id === invitation.id
                        }
                      />
                    }
                  />
                );
              })}
            </SheetGroup>
            <SheetNote>{t`You see who joined, not their reviews.`}</SheetNote>
          </>
        )}
        <SheetHeading>{t`Who can join`}</SheetHeading>
        {linkFailed ? (
          <SheetGroup>
            <LoadFailed
              query={joinLink}
              failed={t`Couldn’t load the join link`}
              offline={t`The join link needs a connection`}
              size="inline"
            />
          </SheetGroup>
        ) : !joinLink.data ? (
          <Skeleton height={104} />
        ) : (
          <SheetGroup>
            <SheetRow
              label={t`Private`}
              detail={online ? t`Only people you invite` : t`Needs a connection`}
              chosen={!shared}
              disabled={!online}
              onPress={() => shared && !turnOff.isPending && askTurnOff()}
            />
            <SheetRow
              label={t`Anyone with the link`}
              detail={online ? t`Anyone who opens it can join` : t`Needs a connection`}
              chosen={shared}
              disabled={!online}
              onPress={() => !shared && turnOn.mutate()}
            />
            {shared && (
              <View className="gap-2.5 pt-3 pb-3.5 ps-4 pe-3.5">
                {link ? (
                  <>
                    <View className="min-h-11 flex-row items-center gap-2 rounded-xl bg-glass-plate px-3 py-2">
                      <Icon name="linkOn" size={16} colour={p.muted} />
                      {/* Android clips a selectable line rather than ending it in an ellipsis; Copy link is beside it. */}
                      <Text
                        className="flex-1 text-md text-text"
                        numberOfLines={1}
                        selectable={Platform.OS === "ios"}
                      >
                        {link.url}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      {clipboard && (
                        <LinkButton
                          icon={copied ? "check" : "copy"}
                          label={copied ? t`Copied` : t`Copy link`}
                          onPress={() => {
                            clipboard.setString(link.url);
                            setCopied(true);
                            AccessibilityInfo.announceForAccessibility(t`Copied`);
                          }}
                        />
                      )}
                      <LinkButton
                        icon="share"
                        label={t`Share`}
                        onPress={() =>
                          // iOS shows both a url and a message, so the link would appear twice.
                          void Share.share(
                            Platform.OS === "ios"
                              ? { url: link.url, title: deck?.name }
                              : { message: link.url, title: deck?.name },
                          )
                        }
                      />
                    </View>
                    <Press
                      onPress={askTurnOff}
                      disabled={!online || turnOff.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={t`Turn off link`}
                      accessibilityState={{
                        disabled: !online || turnOff.isPending,
                        busy: turnOff.isPending,
                      }}
                      className={`min-h-11 flex-row items-center justify-center gap-2 px-3 ${online && !turnOff.isPending ? "" : "opacity-45"}`}
                    >
                      <Icon name="linkOff" size={18} colour={p.danger} />
                      <Text className="text-md font-medium text-danger">{t`Turn off link`}</Text>
                    </Press>
                  </>
                ) : (
                  <Skeleton height={44} />
                )}
              </View>
            )}
          </SheetGroup>
        )}
      </ScrollView>
    </OnGlass>
  );
}

function LinkButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[14px] bg-glass-plate px-3 py-2"
    >
      <Icon name={icon} size={18} colour={p.text} />
      <Text className="text-md font-medium text-text" numberOfLines={1}>
        {label}
      </Text>
    </Press>
  );
}

function PersonRow({
  name,
  line,
  end,
  pending = false,
}: {
  name: string;
  line: string;
  end: ReactNode;
  /** Invited and not joined yet: a dashed mark, as the web draws it. */
  pending?: boolean;
}) {
  return (
    <View className="min-h-16 flex-row items-center gap-3 py-2.5 ps-4 pe-2">
      <View
        className={`size-9 items-center justify-center rounded-full ${pending ? "border border-dashed border-edge-2" : "bg-glass-plate"}`}
      >
        <Text className={`text-sm font-medium ${pending ? "text-faint" : "text-text-2"}`}>
          {initial(name)}
        </Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-md font-medium text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {line}
        </Text>
      </View>
      {end}
    </View>
  );
}

/** The first character, by code point, so an emoji or an accented letter is not cut in half. */
function initial(name: string) {
  return (Array.from(name.trim())[0] ?? "").toUpperCase();
}
