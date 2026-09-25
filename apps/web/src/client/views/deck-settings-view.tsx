import { Trans, useLingui } from "@lingui/react/macro";
import { type Directions, deckLimits, type SectionProgression } from "@lymi/core";
import { clsx } from "clsx";
import {
  Archive,
  Check,
  Link2Off,
  LogOut,
  MailX,
  MoreHorizontal,
  Share,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "../components/avatar";
import { Button, IconButton } from "../components/button";
import { Chip } from "../components/chip";
import { CopyField } from "../components/copy-field";
import {
  type DirectionExample,
  DirectionField,
  directionLabel,
  LanguageField,
  languageName,
} from "../components/deck-fields";
import { InlineError } from "../components/inline-error";
import { Screen } from "../components/layout/screen";
import { TurnOffLinkDialog } from "../components/member-dialogs";
import { PublisherMark } from "../components/publisher-mark";
import { RadioCard } from "../components/radio-card";
import { SectionManager, type SectionManagerProps } from "../components/section-manager";
import { SettingsGroup } from "../components/settings-group";
import { Skeleton } from "../components/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { RadioGroup } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import type { DeckSummary, Invitation, Member } from "../lib/api";

/** What the screen can change. The same shape the deck endpoint takes. */
export interface DeckSettingsPatch {
  name?: string;
  description?: string | null;
  defaultLanguage?: string | null;
  directions?: Directions;
  sectionProgression?: SectionProgression;
}

export interface DeckSettingsProps {
  deck: DeckSummary | undefined;
  /** A card from the deck, so each direction reads with words the learner recognises. */
  example?: DirectionExample | undefined;
  onSave: (patch: DeckSettingsPatch) => void;
  saving?: boolean | undefined;
  /** True for a few seconds after a save lands. */
  saved?: boolean | undefined;
  error?: string | undefined;
  onArchive?: (() => void) | undefined;
  /** A member's way out of the deck. Absent for the owner, who archives it instead. */
  onLeave?: (() => void) | undefined;
  /** The owner's section controls. Absent for a member, who cannot change them. */
  sections?: SectionManagerProps | undefined;
  /** The owner's member list. Absent for a member, who never sees who else joined. ADR 0011. */
  members?: MembersProps | undefined;
  /** The owner's join-link controls. Absent for a member, who cannot share the deck. */
  sharing?: SharingProps | undefined;
}

export interface MembersProps {
  /** The deck's writer, who is not a member row and cannot be removed. */
  owner: { name: string };
  /** Undefined while loading. Empty when nobody has joined. */
  members: Member[] | undefined;
  /** Addresses asked in who have not joined. Undefined while loading. */
  invitations: Invitation[] | undefined;
  /** Opens the invite dialog; the dialog owns the address and what is wrong with it. */
  onInvite: () => void;
  onRemove: (member: Member) => void;
  /** The member the removal is running for, so only their row shows it. */
  removing?: string | undefined;
  onCancelInvite: (invitation: Invitation) => void;
  cancelling?: string | undefined;
  error?: string | undefined;
}

export interface SharingProps {
  deckName: string;
  /** Undefined while loading; null while sharing is off. */
  link: { url: string } | null | undefined;
  onTurnOn: () => void;
  onTurnOff: () => void;
  pending?: "on" | "off" | undefined;
  error?: string | undefined;
}

/**
 * Everything about a deck that is not its cards. Its own screen rather than a sheet: on the
 * phone it pushes in and the back gesture works, and the direction choice needs room to say
 * what it does. Nothing here has a Save button — a change is made when it is made, and every
 * one of them is reversible.
 */
export function DeckSettingsView({
  deck,
  example,
  onSave,
  saving,
  saved,
  error,
  onArchive,
  onLeave,
  sections,
  sharing,
  members,
}: DeckSettingsProps) {
  const { t } = useLingui();
  const reading = !!deck && deck.role !== "owner";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // The deck arrives after the first paint, and again after every save.
  useEffect(() => {
    if (!deck) return;
    setName(deck.name);
    setDescription(deck.description ?? "");
  }, [deck]);

  const commitName = () => {
    const next = name.trim();
    if (!deck) return;
    if (!next) {
      setName(deck.name);
      return;
    }
    if (next !== deck.name) onSave({ name: next });
  };
  const commitDescription = () => {
    const next = description.trim();
    if (!deck || next === (deck.description ?? "")) return;
    onSave({ description: next || null });
  };

  // Leaving the screen with the caret still in a field is the one way an edit could be
  // lost, and on the phone that is a back swipe. Save what is dirty on the way out.
  const pending = useRef<{ name: string; description: string; deck: DeckSummary } | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  pending.current = deck && !reading ? { name, description, deck } : null;
  useEffect(
    () => () => {
      const p = pending.current;
      if (!p) return;
      const patch: DeckSettingsPatch = {};
      const nextName = p.name.trim();
      if (nextName && nextName !== p.deck.name) patch.name = nextName;
      const nextDescription = p.description.trim();
      if (nextDescription !== (p.deck.description ?? "")) {
        patch.description = nextDescription || null;
      }
      if (Object.keys(patch).length > 0) saveRef.current(patch);
    },
    [],
  );

  return (
    <Screen
      title={reading ? t`About this deck` : t`Deck settings`}
      width="md"
      backOnDesktop
      back={
        deck
          ? { label: deck.name, to: "/library/$deckId", params: { deckId: deck.id } }
          : // Inert until the deck is known, so an early tap never lands on the wrong screen.
            { label: t`Deck` }
      }
      status={
        reading ? undefined : (
          <p className="min-h-5 text-sm text-muted" role="status">
            {error ? (
              <InlineError>{error}</InlineError>
            ) : saving ? (
              t`Saving…`
            ) : saved ? (
              <span className="enter-fade inline-flex items-center gap-1.5">
                <Check className="size-4" aria-hidden="true" />
                <Trans>Saved</Trans>
              </span>
            ) : null}
          </p>
        )
      }
    >
      {!deck && (
        <div className="grid gap-3 pt-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
          <Skeleton className="h-10" />
        </div>
      )}

      {deck && reading && <DeckAbout deck={deck} example={example} onLeave={onLeave} />}

      {deck && !reading && (
        <>
          <SettingsGroup title={t`Deck`}>
            <Field>
              <FieldLabel>{t`Name`}</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setName(deck.name);
                }}
                maxLength={deckLimits.name ?? undefined}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel aside={t`Optional`}>{t`Description`}</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={commitDescription}
                maxLength={deckLimits.description ?? undefined}
                placeholder={t`Cards from Marco’s Tuesday lessons.`}
                className="min-h-20"
              />
              <FieldDescription>{t`What’s in this deck. Members see it too.`}</FieldDescription>
            </Field>
            <LanguageField
              value={deck.defaultLanguage}
              onChange={(defaultLanguage) => onSave({ defaultLanguage })}
              description={t`The language of this deck’s terms. New cards start with it, and pronunciation and AI enrichment need it. Meanings are in your app language.`}
            />
          </SettingsGroup>

          <SettingsGroup title={t`How cards are asked`}>
            <DirectionField
              value={deck.directions}
              onChange={(directions) => onSave({ directions })}
              example={example}
              total={deck.total}
            />
          </SettingsGroup>

          {sections && (
            <SettingsGroup
              id="sections"
              title={t`Sections`}
              description={t`Parts of this deck, such as one per lesson. Everyone studying it sees them in this order.`}
            >
              <SectionManager {...sections} />
              {sections.sections.length > 0 && <ProgressionField deck={deck} onSave={onSave} />}
            </SettingsGroup>
          )}

          {members && <MembersGroup {...members} />}

          {sharing && <SharingGroup {...sharing} />}

          <SettingsGroup title={t`Archive`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-sm text-sm text-muted">
                <Trans>
                  The deck leaves Library and its cards stop coming up in review. Restore brings it
                  back.
                </Trans>
              </p>
              <Button variant="danger" onClick={onArchive} aria-disabled={!onArchive}>
                <Archive data-icon="inline-start" aria-hidden="true" />
                <Trans>Archive deck</Trans>
              </Button>
            </div>
          </SettingsGroup>
        </>
      )}
    </Screen>
  );
}

/** One fact about the deck, label beside value, for a member who reads rather than decides. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-t border-edge py-3 first:border-t-0 first:pt-0 sm:grid-cols-[12rem_1fr] sm:items-baseline sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-base text-text">{children}</dd>
    </div>
  );
}

/**
 * What a member sees where the owner has settings. Nothing on this deck is theirs to change, so
 * the screen states the facts and offers the one move they have: leaving.
 */
function DeckAbout({
  deck,
  example,
  onLeave,
}: {
  deck: DeckSummary;
  example?: DirectionExample | undefined;
  onLeave?: (() => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  const ownerName = deck.owner.name;
  const direction =
    example?.meaning && deck.directions === "recognition"
      ? t`See ${example.term} → recall “${example.meaning}”`
      : example?.meaning && deck.directions === "production"
        ? t`See “${example.meaning}” → recall ${example.term}`
        : undefined;
  return (
    <>
      <SettingsGroup title={t`Shared with you`}>
        <div className="flex items-center gap-2.5">
          {deck.published ? (
            <PublisherMark name={ownerName} src={deck.owner.avatarUrl} size={32} />
          ) : (
            <Avatar name={ownerName} size={32} />
          )}
          <div className="grid min-w-0 gap-0.5">
            <p className="truncate text-base font-medium text-text">{ownerName}</p>
            <p className="text-sm text-muted">
              <Trans>Owns this deck and writes its cards</Trans>
            </p>
          </div>
        </div>
        <p className="max-w-[60ch] text-sm text-muted">
          <Trans>
            You study the same cards as {ownerName}, on your own schedule. Nobody else sees your
            reviews or progress.
          </Trans>
        </p>
      </SettingsGroup>

      <SettingsGroup title={t`Deck`}>
        <dl className="grid">
          {deck.description && <Fact label={t`Description`}>{deck.description}</Fact>}
          <Fact label={t`Language`}>
            {deck.defaultLanguage ? languageName(deck.defaultLanguage) : t`Not set`}
          </Fact>
          <Fact label={t`How cards are asked`}>
            <span className="grid gap-0.5">
              <span>{directionLabel(deck.directions)}</span>
              {direction && <span className="text-sm text-muted">{direction}</span>}
            </span>
          </Fact>
          <Fact label={t`Cards`}>{i18n.number(deck.total)}</Fact>
        </dl>
      </SettingsGroup>

      <SettingsGroup title={t`Leaving this deck`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-sm text-muted">
            <Trans>
              The deck leaves Library and its cards stop coming up in review. If you join again,
              your reviews are still there.
            </Trans>
          </p>
          <Button variant="danger" onClick={onLeave} aria-disabled={!onLeave}>
            <LogOut data-icon="inline-start" aria-hidden="true" />
            <Trans>Leave deck</Trans>
          </Button>
        </div>
      </SettingsGroup>
    </>
  );
}

/**
 * Everyone in the deck, for the owner alone: the writer, whoever joined, and whoever was asked
 * and has not. One list, because the question an owner has is whether somebody is in yet. It
 * says nothing about what anyone has reviewed. ADR 0011.
 */
function MembersGroup({
  owner,
  members,
  invitations,
  onInvite,
  onRemove,
  removing,
  onCancelInvite,
  cancelling,
  error,
}: MembersProps) {
  const { t } = useLingui();
  const loading = members === undefined || invitations === undefined;
  return (
    <SettingsGroup
      title={t`People`}
      description={t`Everyone studying this deck. You see whether they joined, not their reviews.`}
    >
      {error ? (
        <p className="text-sm" role="alert">
          <InlineError>{error}</InlineError>
        </p>
      ) : loading ? (
        <div className="grid gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <ul aria-label={t`People`} className="edge overflow-hidden rounded-lg bg-plate">
          <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge px-3.5 py-3 last:border-b-0">
            <Avatar name={owner.name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-text">{owner.name}</p>
            </div>
            <Chip size="sm">
              <Trans>Owner</Trans>
            </Chip>
          </li>
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              removing={removing === member.userId}
              onRemove={() => onRemove(member)}
            />
          ))}
          {invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              cancelling={cancelling === invitation.id}
              onCancel={() => onCancelInvite(invitation)}
            />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onInvite}>
          <UserPlus data-icon="inline-start" aria-hidden="true" />
          <Trans>Invite</Trans>
        </Button>
      </div>
    </SettingsGroup>
  );
}

/**
 * Somebody asked in who has not joined. The dashed mark and the chip say the same thing twice,
 * because a row that differs only by its date reads as a member at a glance.
 */
function InvitationRow({
  invitation,
  cancelling,
  onCancel,
}: {
  invitation: Invitation;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const { t, i18n } = useLingui();
  const invited = i18n.date(invitation.invitedAt, { day: "numeric", month: "short" });
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge px-3.5 py-3 last:border-b-0">
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full border border-dashed border-edge-2 text-sm font-medium text-faint"
      >
        {invitation.email.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-text">{invitation.email}</p>
        <p className="text-sm text-muted tabular-nums">
          <Trans>invited {invited}</Trans>
        </p>
      </div>
      <Chip size="sm">
        <Trans>Not joined yet</Trans>
      </Chip>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton
              label={t`Options for ${invitation.email}`}
              size="sm"
              aria-disabled={cancelling}
            >
              <MoreHorizontal />
            </IconButton>
          }
        />
        <DropdownMenuContent aria-label={t`Options for ${invitation.email}`} align="end">
          <DropdownMenuItem variant="danger" onClick={onCancel}>
            <MailX />
            <Trans>Cancel invitation</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function MemberRow({
  member,
  removing,
  onRemove,
}: {
  member: Member;
  removing: boolean;
  onRemove: () => void;
}) {
  const { t, i18n } = useLingui();
  const joined = i18n.date(member.joinedAt, { day: "numeric", month: "short" });
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge px-3.5 py-3 last:border-b-0">
      <Avatar name={member.name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-text">{member.name}</p>
        <p className="text-sm text-muted tabular-nums">
          <Trans>joined {joined}</Trans>
        </p>
      </div>
      {/* One quiet trigger per row: the only action takes something away, and a red button on
          every line drowns the names, which are what the owner came to read. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton label={t`Options for ${member.name}`} size="sm" aria-disabled={removing}>
              <MoreHorizontal />
            </IconButton>
          }
        />
        <DropdownMenuContent aria-label={t`Options for ${member.name}`} align="end">
          <DropdownMenuItem variant="danger" onClick={onRemove}>
            <UserMinus />
            <Trans>Remove from deck</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** How the deck's sections open for everyone studying it, made the moment it is chosen. */
function ProgressionField({
  deck,
  onSave,
}: {
  deck: DeckSummary;
  onSave: (patch: DeckSettingsPatch) => void;
}) {
  const { t } = useLingui();
  const name = useId();
  return (
    <div className="grid gap-2 pt-2">
      <p className="text-base font-medium text-text" id={`${name}-label`}>
        <Trans>How sections open</Trans>
      </p>
      <RadioGroup<SectionProgression>
        aria-labelledby={`${name}-label`}
        name={name}
        value={deck.sectionProgression}
        onValueChange={(sectionProgression) => onSave({ sectionProgression })}
      >
        <RadioCard
          value="automatic"
          title={t`One after another, automatically`}
          description={t`Each section opens once you know most of the one before it.`}
        />
        <RadioCard
          value="manual"
          title={t`One after another, when you start them`}
          description={t`When most of a section is known, the next one is ready and you choose when to start it.`}
        />
        <RadioCard
          value="open"
          title={t`All at once`}
          description={t`Every section is open, so any card can come up in review.`}
        />
      </RadioGroup>
      <p className="text-sm text-muted">
        <Trans>Anyone studying the deck can start a later section early.</Trans>
      </p>
    </div>
  );
}

/**
 * Private or shared by link. Sharing is a choice with a consequence, so it reads like the
 * other choices on the screen, and the link lives under the option that made it. Going back to
 * private kills the URL for good, so that one asks first.
 */
function SharingGroup({ deckName, link, onTurnOn, onTurnOff, pending, error }: SharingProps) {
  const { t } = useLingui();
  const name = useId();
  const [confirming, setConfirming] = useState(false);
  const shared = Boolean(link) || pending === "on";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // A link that just went off must not stay on screen as if it still worked.
  useEffect(() => {
    if (!link) setConfirming(false);
  }, [link]);

  return (
    <SettingsGroup title={t`Visibility`}>
      {link === undefined && !pending ? (
        <div className="grid gap-2">
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
        </div>
      ) : (
        <RadioGroup<"private" | "link">
          aria-label={t`Who can join this deck`}
          name={name}
          value={shared ? "link" : "private"}
          // Neither choice takes effect here: private asks first, and link waits for the server.
          onValueChange={(choice) => {
            if (choice === "private") setConfirming(true);
            else if (!pending) onTurnOn();
          }}
        >
          <RadioCard
            value="private"
            title={t`Private`}
            description={t`Only people you invite can join. Current members stay.`}
          />
          <div
            className={clsx(
              "rounded-md bg-plate transition-[box-shadow] duration-150",
              shared ? "edge-2" : "edge",
            )}
          >
            <RadioCard
              bare
              value="link"
              title={t`Anyone with the link`}
              description={t`Anyone with the link can join and review your cards on their own schedule. They cannot change the cards, and you do not see their progress.`}
            />
            {shared && (
              <div className="enter-fade grid gap-3 px-3.5 pb-3.5 sm:ps-[calc(0.875rem+18px+0.75rem)]">
                {link ? (
                  <CopyField value={link.url} label={t`Join link`} singleLine />
                ) : (
                  <Skeleton className="h-10" />
                )}
                {link && (
                  <div className="flex flex-wrap gap-2">
                    {canShare && (
                      <Button
                        onClick={() => {
                          void navigator.share({ title: deckName, url: link.url }).catch(() => {});
                        }}
                      >
                        <Share data-icon="inline-start" aria-hidden="true" />
                        <Trans>Share link</Trans>
                      </Button>
                    )}
                    <Button onClick={() => setConfirming(true)}>
                      <Link2Off data-icon="inline-start" aria-hidden="true" />
                      <Trans>Turn off link</Trans>
                    </Button>
                  </div>
                )}
                <TurnOffLinkDialog
                  open={confirming}
                  onOpenChange={setConfirming}
                  onTurnOff={onTurnOff}
                  pending={pending === "off"}
                />
              </div>
            )}
          </div>
        </RadioGroup>
      )}
      {error && (
        <p className="text-sm" role="alert">
          <InlineError>{error}</InlineError>
        </p>
      )}
    </SettingsGroup>
  );
}
