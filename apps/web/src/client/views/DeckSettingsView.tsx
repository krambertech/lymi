import { Trans, useLingui } from "@lingui/react/macro";
import type { Directions } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { Archive, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { type DirectionExample, DirectionField, LanguageField } from "../components/DeckFields";
import { Field, Input, Textarea } from "../components/Field";
import { SettingsGroup } from "../components/SettingsGroup";
import { Skeleton } from "../components/Skeleton";
import type { DeckSummary } from "../lib/api";
import { BackButton, Page, PageHeader, type StaticNav, TopBar } from "./Shell";

/** What the screen can change. The same shape the deck endpoint takes. */
export interface DeckSettingsPatch {
  name?: string;
  description?: string | null;
  defaultLanguage?: string | null;
  directions?: Directions;
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
  static?: StaticNav;
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
  static: st,
}: DeckSettingsProps) {
  const { t } = useLingui();
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
  pending.current = deck ? { name, description, deck } : null;
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
        title={t`Deck settings`}
        actions={
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
        }
      />

      {!deck && (
        <div className="grid gap-3 pt-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
          <Skeleton className="h-10" />
        </div>
      )}

      {deck && (
        <>
          <SettingsGroup title={t`Deck`}>
            <Field label={t`Name`}>
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
            <Field
              label={t`Description`}
              aside={t`Optional`}
              hint={t`A note to yourself about what is in here.`}
            >
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={commitDescription}
                maxLength={500}
                placeholder={t`Cards from Marco’s Tuesday lessons.`}
                className="min-h-20"
              />
            </Field>
            <LanguageField
              value={deck.defaultLanguage}
              onChange={(defaultLanguage) => onSave({ defaultLanguage })}
              hint={t`The language this deck’s cards are in. It starts every new card, and pronunciation and AI need it to work. Meanings are written in your meaning language, which follows the app language in Settings.`}
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
