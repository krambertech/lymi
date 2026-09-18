import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { Directions, SectionProgression } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Archive, Check, Link2Off, LogOut, Share } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Avatar } from "../components/avatar";
import { Button } from "../components/button";
import { CopyField } from "../components/copy-field";
import {
  type DirectionExample,
  DirectionField,
  directionLabel,
  LanguageField,
  languageName,
} from "../components/deck-fields";
import { PublisherMark } from "../components/publisher-mark";
import { RadioCard } from "../components/radio-card";
import { SectionManager, type SectionManagerProps } from "../components/section-manager";
import { SettingsGroup } from "../components/settings-group";
import { Skeleton } from "../components/skeleton";
import { Field, FieldContent, FieldDescription, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { RadioGroup } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import type { DeckSummary } from "../lib/api";
import { BackButton, Page, PageHeader, type StaticNav, TopBar } from "./shell";

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
  /** The owner's join-link controls. Absent for a member, who cannot share the deck. */
  sharing?: SharingProps | undefined;
  static?: StaticNav;
}

export interface SharingProps {
  deckName: string;
  /** Undefined while loading; null while sharing is off. */
  link: { url: string } | null | undefined;
  /** People who joined and are still in. Turning the link off does not remove them. */
  members: number;
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
  static: st,
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
    <Page width="md">
      <TopBar
        nested
        back={
          <BackButton label={deck?.name ?? t`Deck`}>
            {(className, content) =>
              st || !deck ? (
                <span className={className}>{content}</span>
              ) : (
                <Link to="/library/$deckId" params={{ deckId: deck.id }} className={className}>
                  {content}
                </Link>
              )
            }
          </BackButton>
        }
      />
      <PageHeader
        title={reading ? t`About this deck` : t`Deck settings`}
        actions={
          reading ? undefined : (
            <p className="min-h-5 text-sm text-muted" role="status">
              {error ? (
                <span className="text-danger">{error}</span>
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
      />

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
                maxLength={80}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel aside={t`Optional`}>{t`Description`}</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={commitDescription}
                maxLength={500}
                placeholder={t`Cards from Marco’s Tuesday lessons.`}
                className="min-h-20"
              />
              <FieldDescription>{t`A note to yourself about what is in here.`}</FieldDescription>
            </Field>
            <LanguageField
              value={deck.defaultLanguage}
              onChange={(defaultLanguage) => onSave({ defaultLanguage })}
              description={t`The language this deck’s cards are in. It starts every new card, and pronunciation and AI need it to work. Meanings are written in your meaning language, which follows the app language in Settings.`}
            />
          </SettingsGroup>

          <SettingsGroup title={t`How you are asked`}>
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
              description={t`Parts of the deck, such as one lesson each. Everyone studying the deck sees them in this order.`}
            >
              <SectionManager {...sections} />
              {sections.sections.length > 0 && <ProgressionField deck={deck} onSave={onSave} />}
            </SettingsGroup>
          )}

          {sharing && <SharingGroup {...sharing} />}

          <SettingsGroup title={t`Archive`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-sm text-sm text-muted">
                <Trans>
                  The deck leaves Library and its cards stop coming up. Nothing is deleted, and
                  Restore puts it back.
                </Trans>
              </p>
              <Button variant="danger" onClick={onArchive} aria-disabled={!onArchive}>
                <Archive aria-hidden="true" />
                <Trans>Archive deck</Trans>
              </Button>
            </div>
          </SettingsGroup>
        </>
      )}
    </Page>
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
            You study the same cards {ownerName} does, on your own schedule. Your reviews and
            progress are yours, and nobody else sees them.
          </Trans>
        </p>
      </SettingsGroup>

      <SettingsGroup title={t`Deck`}>
        <dl className="grid">
          {deck.description && <Fact label={t`Description`}>{deck.description}</Fact>}
          <Fact label={t`Language`}>
            {deck.defaultLanguage ? languageName(deck.defaultLanguage) : t`Not set`}
          </Fact>
          <Fact label={t`How you are asked`}>
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
              The deck leaves Library and its cards stop coming up. Your reviews are kept, so
              joining again picks up where you left off.
            </Trans>
          </p>
          <Button variant="danger" onClick={onLeave} aria-disabled={!onLeave}>
            <LogOut aria-hidden="true" />
            <Trans>Leave deck</Trans>
          </Button>
        </div>
      </SettingsGroup>
    </>
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
function SharingGroup({
  deckName,
  link,
  members,
  onTurnOn,
  onTurnOff,
  pending,
  error,
}: SharingProps) {
  const { t } = useLingui();
  const name = useId();
  const [confirming, setConfirming] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  const shared = Boolean(link) || pending === "on";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // A link that just went off must not stay on screen as if it still worked.
  useEffect(() => {
    if (!link) setConfirming(false);
  }, [link]);
  useEffect(() => {
    if (confirming) keep.current?.focus();
  }, [confirming]);

  return (
    <SettingsGroup title={t`Sharing`}>
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
            title={members === 0 ? t`Private` : t`Link off`}
            description={
              members === 0 ? (
                t`Only you study this deck.`
              ) : (
                <Plural
                  value={members}
                  one="Nobody new can join. The one person who joined keeps studying."
                  other="Nobody new can join. The # people who joined keep studying."
                />
              )
            }
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
              title={t`Shared by link`}
              description={t`Anyone with the link can join and review your cards on their own schedule. They cannot change the cards, and you do not see their progress.`}
            />
            {shared && (
              <div className="enter-fade grid gap-3 px-3.5 pb-3.5 sm:ps-[calc(0.875rem+18px+0.75rem)]">
                {link ? (
                  <CopyField value={link.url} label={t`Join link`} singleLine />
                ) : (
                  <Skeleton className="h-10" />
                )}
                {confirming ? (
                  <fieldset
                    aria-label={t`Turn off the join link`}
                    className="enter-fade grid gap-3 rounded-md bg-plate-2 p-4"
                  >
                    <p className="grid gap-1 text-sm text-text-2">
                      <span className="text-base font-medium text-text">
                        <Trans>Turn off the join link?</Trans>
                      </span>
                      <Trans>
                        The link stops working for good. People who joined stay in the deck, and
                        sharing again makes a new link.
                      </Trans>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        onClick={onTurnOff}
                        loading={pending === "off"}
                        aria-disabled={pending !== undefined}
                      >
                        <Trans>Turn off link</Trans>
                      </Button>
                      <Button ref={keep} variant="ghost" onClick={() => setConfirming(false)}>
                        <Trans>Keep sharing</Trans>
                      </Button>
                    </div>
                  </fieldset>
                ) : (
                  link && (
                    <div className="flex flex-wrap gap-2">
                      {canShare && (
                        <Button
                          onClick={() => {
                            void navigator
                              .share({ title: deckName, url: link.url })
                              .catch(() => {});
                          }}
                        >
                          <Share aria-hidden="true" />
                          <Trans>Share link</Trans>
                        </Button>
                      )}
                      <Button onClick={() => setConfirming(true)}>
                        <Link2Off aria-hidden="true" />
                        <Trans>Turn off link</Trans>
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </RadioGroup>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </SettingsGroup>
  );
}
