import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  CardInput,
  cardLimits,
  ImageDescription,
  modeKey,
  modeOf,
  type ReviewModeKey,
  revealsAnswer,
} from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
  AlertCircle,
  AudioLines,
  Bookmark,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Link2,
  NotebookPen,
  Plus,
  Settings2,
  Tag,
  TextQuote,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Card, DeckSummary } from "../lib/api";
import { useObjectUrl } from "../lib/avatar";
import { useDesktop } from "../lib/device";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { lastDeckId } from "../lib/last-deck";
import { sectionsQuery } from "../lib/queries";
import { Button } from "./button";
import { acceptsPictureFile, CardPictureField, type PictureDraft } from "./card-picture-field";
import { LanguageField, languageName } from "./deck-fields";
import { FieldChip, FieldChipRow } from "./field-chip";
import { Kbd } from "./kbd";
import { ReviewModesField } from "./review-modes-field";
import { TagsInput } from "./tags-input";
import { Checkbox } from "./ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

/** Every field as typed, trimmed, and checked against the schema the route parses with. */
export interface CardFormValues {
  deckId: string;
  term: string;
  meaning: string;
  pronunciation: string;
  example: string;
  notes: string;
  source: string;
  tags: string[];
  language: string | null;
  /** Null follows the deck. */
  reviewModes: ReviewModeKey[] | null;
  picture: PictureDraft;
  description: string;
  /** A section of the chosen deck, or none. */
  sectionId: string | null;
}

/** What a submit did, so the form can say it under the term. */
export type CardFormOutcome =
  | { status: "added"; term: string; pictureError?: string | undefined }
  | { status: "skipped"; term: string; deckName: string }
  | { status: "failed"; message: string };

/** The form as it stands, for a draft the sheet can bring back after it closes. */
export interface CardFormDraft extends CardFormValues {
  /** Whether the learner picked the language, rather than it following the deck. */
  languageChosen: boolean;
}

export interface CardFormProps {
  mode: "add" | "edit";
  /** Only decks the learner owns take a card. */
  decks: DeckSummary[] | undefined;
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string | undefined;
  /** Preselect a section of that deck. */
  sectionId?: string | undefined;
  /** The card being edited. */
  card?: Card | undefined;
  /** A discarded draft being brought back. */
  draft?: CardFormDraft | undefined;
  pending?: boolean | undefined;
  /** Adding: whether the sheet stays open for the next card. */
  createMore?: boolean | undefined;
  onCreateMoreChange?: ((createMore: boolean) => void) | undefined;
  onCancel: () => void;
  /** Offered when there is no deck to add to yet. */
  onCreateDeck?: (() => void) | undefined;
  onSubmit: (
    values: CardFormValues,
  ) => Promise<CardFormOutcome | undefined> | CardFormOutcome | undefined;
  /** Every change, so the sheet can keep a draft to bring back. */
  onDraftChange?: ((draft: CardFormDraft) => void) | undefined;
  /** Chips that open one field at a time, or the whole form. Follows the machine unless set. */
  layout?: "chips" | "whole" | undefined;
  /** Opens with the picture field showing, for adding a picture that did not go through. */
  openPicture?: boolean | undefined;
  /** Adding with Create more: offered beside a notice that the picture did not go through. */
  onRetryPicture?: (() => void) | undefined;
  /** No autofocus. For the design page. */
  static?: boolean | undefined;
}

/** Under a tenth of a field left. Before that a count is noise; after it, it is the warning. */
const NEARLY_FULL = 0.9;

type Notice = { kind: "ok" | "warn" | "dup"; text: string };
type Panel = "picture" | "example" | "pronunciation" | "notes" | "source" | "tags" | "settings";

/** Which panel holds each field, so a refused field opens where it can be fixed. */
const PANEL_OF: Record<string, Panel> = {
  description: "picture",
  example: "example",
  pronunciation: "pronunciation",
  notes: "notes",
  source: "source",
  tags: "tags",
  reviewModes: "settings",
};

/**
 * One form for adding a card and changing it: term, meaning and deck, then a row of chips for
 * everything else a card holds. DESIGN.md "Adding and editing a card".
 */
export function CardForm({
  mode,
  decks,
  deckId,
  sectionId,
  card,
  draft,
  pending,
  createMore,
  onCreateMoreChange,
  onCancel,
  onCreateDeck,
  onSubmit,
  onDraftChange,
  layout,
  openPicture,
  onRetryPicture,
  static: st,
}: CardFormProps) {
  const { t, i18n } = useLingui();
  const desktop = useDesktop();
  const chips = (layout ?? (desktop ? "whole" : "chips")) === "chips";
  const adding = mode === "add";

  const [term, setTerm] = useState(draft?.term ?? card?.term ?? "");
  const [meaning, setMeaning] = useState(draft?.meaning ?? card?.meaning ?? "");
  const [deck, setDeck] = useState(draft?.deckId ?? card?.deckId ?? deckId ?? "");
  const [section, setSection] = useState<string | null>(
    draft ? draft.sectionId : card ? card.sectionId : (sectionId ?? null),
  );
  const [pronunciation, setPronunciation] = useState(
    draft?.pronunciation ?? card?.pronunciation ?? "",
  );
  const [example, setExample] = useState(draft?.example ?? card?.example ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? card?.notes ?? "");
  const [source, setSource] = useState(draft?.source ?? card?.source ?? "");
  const [tags, setTags] = useState<string[]>(draft?.tags ?? card?.tags ?? []);
  // Until the learner picks one, a new card takes its deck's language.
  const [chosenLanguage, setChosenLanguage] = useState<{ value: string | null } | null>(() => {
    if (draft) return draft.languageChosen ? { value: draft.language } : null;
    return card ? { value: card.language } : null;
  });
  const [modes, setModes] = useState<ReviewModeKey[] | null>(() => {
    if (draft) return draft.reviewModes;
    return card?.reviewModes ? card.reviewModes.map(modeKey) : null;
  });
  const [picture, setPicture] = useState<PictureDraft>(
    draft?.picture ?? (card?.image ? { kind: "current", image: card.image } : { kind: "none" }),
  );
  const [description, setDescription] = useState(
    draft?.description ?? card?.image?.description ?? "",
  );
  const [fileError, setFileError] = useState<string>();
  const [panel, setPanel] = useState<Panel | null>(openPicture && chips ? "picture" : null);
  // Desktop: the extra fields stay folded until asked for, or until an edited card already uses them.
  const [expanded, setExpanded] = useState(
    () =>
      !!openPicture ||
      (!!card &&
        !!(
          card.image ||
          card.example ||
          card.pronunciation ||
          card.notes ||
          card.source ||
          card.tags.length ||
          card.reviewModes
        )),
  );
  const moreId = useId();
  const reduceMotion = useReducedMotion();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const termRef = useRef<HTMLInputElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openPicture || chips) return;
    // After the dialog has placed its own initial focus, so this one wins.
    const timer = setTimeout(() => {
      pictureRef.current
        ?.querySelector<HTMLElement>("button, input")
        ?.focus({ preventScroll: true });
      pictureRef.current?.scrollIntoView({ block: "center" });
    }, 80);
    return () => clearTimeout(timer);
  }, [openPicture, chips]);
  const formRef = useRef<HTMLFormElement>(null);

  const owned = useMemo(() => decks?.filter((d) => d.role === "owner"), [decks]);
  // A deck handed in that the learner does not own, such as the N key on a shared deck, is not
  // one a card can go into, so the picker falls back rather than failing on submit.
  useEffect(() => {
    if (!owned?.length || (deck && owned.some((d) => d.id === deck))) return;
    const last = lastDeckId();
    setDeck(owned.find((d) => d.id === last)?.id ?? owned[0]?.id ?? "");
  }, [owned, deck]);

  const noDecks = owned?.length === 0;
  const current = decks?.find((d) => d.id === deck);
  const sections = useQuery({
    ...sectionsQuery(deck),
    enabled: !st && !!deck && current?.role === "owner",
  }).data?.sections;
  const deckLanguage = current?.defaultLanguage ?? null;
  const language = chosenLanguage ? chosenLanguage.value : deckLanguage;
  const deckModes = (current?.reviewModes ?? []).map(modeKey);
  const hasPicture = picture.kind !== "none";
  const preview = useObjectUrl(picture.kind === "file" ? picture.file : null);

  const values: CardFormValues = {
    deckId: deck,
    term: term.trim(),
    meaning: meaning.trim(),
    pronunciation: pronunciation.trim(),
    example: example.trim(),
    notes: notes.trim(),
    source: source.trim(),
    tags,
    language,
    reviewModes: modes,
    picture,
    description: description.trim(),
    sectionId: section,
  };
  const draftRef = useRef(onDraftChange);
  draftRef.current = onDraftChange;
  useEffect(() => {
    draftRef.current?.({ ...values, languageChosen: chosenLanguage !== null });
  });

  const clear = (key: string) => setInvalid(({ [key]: _, ...rest }) => rest);
  /** What is left in a nearly full field. `maxLength` stops the typing; this says so first. */
  const roomLeft = (value: string, limit: number | null) => {
    if (limit === null || value.length < limit * NEARLY_FULL) return undefined;
    const left = limit - value.length;
    return (
      <span role="status">
        {t`${plural(left, { one: "# character left", other: "# characters left" })}`}
      </span>
    );
  };
  const panelProps = (name: Panel) => ({
    open: panel === name,
    onOpenChange: (open: boolean) => setPanel(open ? name : null),
  });
  // Enter in a one-line field inside a panel is done with that field, not the card.
  const closeOnEnter = (e: React.KeyboardEvent) => {
    if (chips && e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      setPanel(null);
    }
  };

  const takePastedPicture = (file: File) => {
    setPanel("picture");
    if (!acceptsPictureFile(file)) {
      setFileError(t`Use a JPEG, PNG, WebP or still GIF under 10 MB.`);
      return;
    }
    setFileError(undefined);
    setPicture({ kind: "file", file });
  };

  const submit = async () => {
    if (pending) return;
    // The same schema the route parses with, so a field cannot disagree with the API.
    const parsed = CardInput.safeParse({
      ...values,
      reviewModes: values.reviewModes?.map(modeOf) ?? null,
    });
    const errors: FieldErrors = parsed.success
      ? {}
      : fieldErrors(parsed.error, {
          deckId: t`Choose a deck.`,
          term: values.term ? t`Keep the term under 500 characters.` : t`Type the term.`,
          meaning: t`Keep the meaning under 2000 characters.`,
          pronunciation: t`Keep the pronunciation under 200 characters.`,
          example: t`Keep the example under 2000 characters.`,
          notes: t`Keep the notes under 2000 characters.`,
          source: t`Keep the source under 200 characters.`,
          tags: t`Use up to 20 tags of 40 characters or fewer.`,
          reviewModes: t`Choose at least one way to be asked.`,
        });
    if (hasPicture && values.description) {
      if (!ImageDescription.safeParse(values.description).success) {
        errors.description = t`Keep the description under 300 characters.`;
      } else if (revealsAnswer(values, values.description)) {
        errors.description = t`Describe what the picture shows without naming the term or the meaning.`;
      }
    }
    if (Object.keys(errors).length) {
      setInvalid(errors);
      setNotice(null);
      const onForm = errors.term || errors.meaning || errors.deckId;
      const first = Object.keys(errors)
        .map((k) => PANEL_OF[k])
        .find(Boolean);
      if (!onForm && first && !chips) setExpanded(true);
      if (!onForm && first && chips) setPanel(first);
      else focusFirstInvalid(formRef.current);
      return;
    }
    setInvalid({});
    setFailure(null);
    setPanel(null);
    const outcome = await onSubmit(values);
    if (!outcome) return;
    if (outcome.status === "failed") {
      setFailure(outcome.message);
      return;
    }
    if (outcome.status === "skipped") {
      setNotice({ kind: "dup", text: t`${outcome.term} is already in ${outcome.deckName}` });
      termRef.current?.select();
      return;
    }
    setNotice(
      outcome.pictureError
        ? {
            kind: "warn",
            text: t`Added “${outcome.term}” without its picture. ${outcome.pictureError}`,
          }
        : { kind: "ok", text: t`Added “${outcome.term}”` },
    );
    // A lesson's cards share a language, a source and tags, so those stay for the next card.
    setTerm("");
    setMeaning("");
    setPronunciation("");
    setExample("");
    setNotes("");
    setModes(null);
    setPicture({ kind: "none" });
    setDescription("");
    setFileError(undefined);
    termRef.current?.focus();
  };

  const pictureThumb: ReactNode =
    picture.kind === "file" && preview ? (
      <img src={preview} alt="" className="size-5 shrink-0 rounded-[4px] object-cover" />
    ) : picture.kind === "link" ? (
      <Link2 className="size-4 shrink-0 text-text-2" aria-hidden="true" />
    ) : undefined;
  const pictureName =
    picture.kind === "file"
      ? picture.file.name || t`Pasted picture`
      : picture.kind === "link"
        ? picture.host
        : picture.kind === "current"
          ? t`Current picture`
          : undefined;
  const settingsValue = [
    chosenLanguage && language !== deckLanguage
      ? language
        ? languageName(language, i18n.locale)
        : t`No language`
      : null,
    modes ? t`own review` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const filled = [
    hasPicture,
    example.trim(),
    pronunciation.trim(),
    notes.trim(),
    source.trim(),
    tags.length > 0,
    !!settingsValue,
  ].filter(Boolean).length;
  const tagsValue =
    tags.length === 0 ? "" : tags.length === 1 ? tags[0] : `${tags[0]} +${tags.length - 1}`;
  const deckName = current?.name;

  const termField = (
    <Field>
      <FieldLabel aside={roomLeft(term, cardLimits.term)}>{t`Term`}</FieldLabel>
      <Input
        ref={termRef}
        // On touch the drawer settles first and the keyboard waits for a tap on the field.
        autoFocus={adding && !st && !chips}
        maxLength={cardLimits.term ?? undefined}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setNotice(null);
          clear("term");
        }}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint={adding ? "done" : "enter"}
      />
      <FieldError>{invalid.term}</FieldError>
      {adding && (
        <p
          role="status"
          className={cn(
            "flex items-start gap-1.5 text-sm empty:hidden",
            notice?.kind === "warn" ? "text-text" : "text-text-2",
          )}
        >
          {notice?.kind === "ok" && (
            <Check className="mt-0.5 size-3.5 shrink-0 text-good" aria-hidden="true" />
          )}
          {notice?.kind === "warn" && (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
          )}
          {notice && <span className="min-w-0">{notice.text}</span>}
          {notice?.kind === "warn" && onRetryPicture && (
            <Button size="sm" variant="ghost" className="-my-1 shrink-0" onClick={onRetryPicture}>
              <Trans>Add picture</Trans>
            </Button>
          )}
        </p>
      )}
    </Field>
  );

  const meaningField = (
    <Field>
      <FieldLabel
        aside={roomLeft(meaning, cardLimits.meaning) ?? t`Optional`}
      >{t`Meaning`}</FieldLabel>
      {/* One line to start, like the term; Enter still adds the card and Shift Enter breaks the line. */}
      <Textarea
        maxLength={cardLimits.meaning ?? undefined}
        value={meaning}
        rows={1}
        className="min-h-11 py-2.5 leading-normal md:min-h-10"
        onChange={(e) => {
          setMeaning(e.target.value);
          clear("meaning");
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }}
        autoComplete="off"
      />
      <FieldError>{invalid.meaning}</FieldError>
    </Field>
  );

  const deckField = noDecks ? (
    <FieldSet className="gap-1.5">
      <FieldLegend variant="label">{t`Deck`}</FieldLegend>
      <Button onClick={onCreateDeck} aria-disabled={!onCreateDeck}>
        <Plus aria-hidden="true" />
        <Trans>New deck</Trans>
      </Button>
      <FieldDescription>{t`Create a deck to add this card to.`}</FieldDescription>
    </FieldSet>
  ) : (
    <Field>
      <FieldLabel>{t`Deck`}</FieldLabel>
      <Select
        value={deck || null}
        onValueChange={(v) => {
          if ((v ?? "") !== deck) setSection(null);
          setDeck(v ?? "");
          clear("deckId");
        }}
        items={(owned ?? []).map((d) => ({ value: d.id, label: d.name }))}
      >
        <SelectTrigger>
          <SelectValue placeholder={t`Choose one`} />
        </SelectTrigger>
        <SelectContent aria-label={t`Deck`}>
          {(owned ?? []).map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>{invalid.deckId}</FieldError>
    </Field>
  );

  // A deck with sections asks which one; the list is the deck's own, so a moved card leaves its section.
  const sectionField = sections && sections.length > 0 && (
    <Field>
      <FieldLabel aside={t`Optional`}>{t`Section`}</FieldLabel>
      <Select
        value={section ?? ""}
        onValueChange={(v) => setSection(v ? v : null)}
        items={[
          { value: "", label: t`No section` },
          ...sections.map((s) => ({ value: s.id, label: s.name })),
        ]}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent aria-label={t`Section`}>
          <SelectItem value="">{t`No section`}</SelectItem>
          {sections.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  const pictureControl = (
    <CardPictureField
      compact={!chips}
      value={picture}
      onChange={(next) => {
        setPicture(next);
        clear("description");
      }}
      description={description}
      onDescriptionChange={(value) => {
        setDescription(value);
        clear("description");
      }}
      descriptionError={invalid.description}
      fileError={fileError}
      onFileError={setFileError}
    />
  );

  const exampleField = (
    <Field>
      <FieldLabel
        className={chips ? "sr-only" : undefined}
        aside={roomLeft(example, cardLimits.example)}
      >
        {t`Example`}
      </FieldLabel>
      <Textarea
        maxLength={cardLimits.example ?? undefined}
        value={example}
        rows={chips ? 3 : 2}
        className={chips ? undefined : "min-h-[68px]"}
        onChange={(e) => {
          setExample(e.target.value);
          clear("example");
        }}
      />
      <FieldError>{invalid.example}</FieldError>
    </Field>
  );

  const pronunciationField = (
    <Field>
      <FieldLabel
        className={chips ? "sr-only" : undefined}
        aside={roomLeft(pronunciation, cardLimits.pronunciation)}
      >
        {t`Pronunciation`}
      </FieldLabel>
      <Input
        maxLength={cardLimits.pronunciation ?? undefined}
        value={pronunciation}
        autoComplete="off"
        onKeyDown={closeOnEnter}
        onChange={(e) => {
          setPronunciation(e.target.value);
          clear("pronunciation");
        }}
      />
      <FieldError>{invalid.pronunciation}</FieldError>
    </Field>
  );

  const notesField = (
    <Field>
      <FieldLabel
        className={chips ? "sr-only" : undefined}
        aside={roomLeft(notes, cardLimits.notes)}
      >
        {t`Notes`}
      </FieldLabel>
      <Textarea
        maxLength={cardLimits.notes ?? undefined}
        value={notes}
        rows={chips ? 3 : 2}
        className={chips ? undefined : "min-h-[68px]"}
        onChange={(e) => {
          setNotes(e.target.value);
          clear("notes");
        }}
      />
      <FieldDescription>{t`Use **bold** and *italic*. Start a line with - or 1. for a list.`}</FieldDescription>
      <FieldError>{invalid.notes}</FieldError>
    </Field>
  );

  const sourceField = (
    <Field>
      <FieldLabel
        className={chips ? "sr-only" : undefined}
        aside={roomLeft(source, cardLimits.source)}
      >
        {t`Source`}
      </FieldLabel>
      <Input
        maxLength={cardLimits.source ?? undefined}
        value={source}
        autoComplete="off"
        onKeyDown={closeOnEnter}
        onChange={(e) => {
          setSource(e.target.value);
          clear("source");
        }}
      />
      <FieldError>{invalid.source}</FieldError>
    </Field>
  );

  const tagsField = (
    <Field>
      <FieldLabel
        className={chips ? "sr-only" : undefined}
        aside={chips ? undefined : t`Enter after each`}
      >
        {t`Tags`}
      </FieldLabel>
      <TagsInput
        value={tags}
        onChange={(next) => {
          setTags(next);
          clear("tags");
        }}
      />
      {chips && <FieldDescription>{t`Press Enter after each tag.`}</FieldDescription>}
      <FieldError>{invalid.tags}</FieldError>
    </Field>
  );

  const settingsFields = (
    <>
      <LanguageField
        value={language}
        onChange={(value) => setChosenLanguage({ value })}
        description={null}
      />
      <ReviewModesField
        value={modes}
        deckModes={deckModes}
        onChange={(next) => {
          setModes(next);
          clear("reviewModes");
        }}
        term={term}
        meaning={meaning}
        hasPicture={hasPicture}
        pictureDescribed={hasPicture && !!description.trim()}
        error={invalid.reviewModes}
      />
    </>
  );
  const settingsChip = (
    <FieldChip
      icon={Settings2}
      keyboard={false}
      label={t`Card settings`}
      value={settingsValue}
      invalid={!!invalid.reviewModes}
      {...panelProps("settings")}
    >
      {settingsFields}
    </FieldChip>
  );

  return (
    <form
      ref={formRef}
      className="grid min-w-0 gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        // ⌘ Enter adds from any field, a panel's included, since panels render inside the form's tree.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void submit();
        }
      }}
      onPaste={(e) => {
        const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
        if (!file) return;
        e.preventDefault();
        takePastedPicture(file);
      }}
    >
      {chips ? (
        <>
          {termField}
          {meaningField}
          {deckField}
          {sectionField}
          <FieldChipRow label={t`More about this card`}>
            <FieldChip
              icon={TextQuote}
              label={t`Example`}
              value={example.trim()}
              invalid={!!invalid.example}
              {...panelProps("example")}
            >
              {exampleField}
            </FieldChip>
            <FieldChip
              icon={AudioLines}
              label={t`Pronunciation`}
              value={pronunciation.trim()}
              invalid={!!invalid.pronunciation}
              {...panelProps("pronunciation")}
            >
              {pronunciationField}
            </FieldChip>
            <FieldChip
              icon={Bookmark}
              label={t`Source`}
              value={source.trim()}
              invalid={!!invalid.source}
              {...panelProps("source")}
            >
              {sourceField}
            </FieldChip>
            <FieldChip
              icon={Tag}
              label={t`Tags`}
              value={tagsValue}
              invalid={!!invalid.tags}
              {...panelProps("tags")}
            >
              {tagsField}
            </FieldChip>
            <FieldChip
              icon={NotebookPen}
              label={t`Notes`}
              value={notes.trim()}
              invalid={!!invalid.notes}
              {...panelProps("notes")}
            >
              {notesField}
            </FieldChip>
            <FieldChip
              icon={ImageIcon}
              keyboard={false}
              label={t`Picture`}
              value={pictureName}
              valueText={pictureName}
              thumbnail={pictureThumb}
              invalid={!!invalid.description || !!fileError}
              {...panelProps("picture")}
            >
              {pictureControl}
            </FieldChip>
            {settingsChip}
          </FieldChipRow>
        </>
      ) : (
        <>
          {termField}
          {meaningField}
          {deckField}
          {sectionField}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={moreId}
            onClick={() => setExpanded((open) => !open)}
            className="-my-1 inline-flex h-9 items-center gap-1.5 justify-self-start rounded-xs text-base font-medium text-text-2 transition-colors duration-150 hoverable:hover:text-text"
          >
            {expanded ? <Trans>Fewer fields</Trans> : <Trans>More fields</Trans>}
            <ChevronDown
              className={cn(
                "size-4 text-muted transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
            {!expanded && filled > 0 && (
              <span className="font-normal text-muted">
                {t`${plural(filled, { one: "# filled", other: "# filled" })}`}
              </span>
            )}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="more"
                id={moreId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.15, height: { duration: 0 } }
                    : { duration: 0.26, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.18 } }
                }
                // Room on every side, so the clip while it opens never cuts a focus ring.
                className="-m-1 -mt-3 overflow-hidden p-1"
              >
                <div className="grid gap-4 pt-2 pb-1">
                  {exampleField}
                  <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4">
                    {pronunciationField}
                    {sourceField}
                  </div>
                  {tagsField}
                  {notesField}
                  <div ref={pictureRef} className="grid gap-1.5">
                    <span className="text-sm font-medium text-text-2">
                      <Trans>Picture</Trans>
                    </span>
                    {pictureControl}
                  </div>
                  {settingsFields}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {failure && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{failure}</span>
        </p>
      )}

      {/* A drawer is put away with a swipe or a tap outside, so on a touch device the row is only the choice and the action. */}
      <div
        className={cn(
          "flex items-center gap-2",
          // The sheet scrolls as one on a short screen, and the actions stay in reach at its foot,
          // which in a drawer sits above the software keyboard. The dialog's scroller has padding
          // that sticky ignores, hence its offset; the drawer's has none.
          chips
            ? "sticky bottom-0 -mx-4 -mb-5 bg-plate px-4 pt-3 pb-5"
            : "sticky -bottom-5 -mx-5 -mb-5 bg-plate px-5 pt-3 pb-5",
        )}
      >
        {adding && onCreateMoreChange && (
          <Field orientation="horizontal" className="me-auto w-auto gap-2">
            <Checkbox checked={!!createMore} onCheckedChange={onCreateMoreChange} />
            <FieldLabel className="text-sm whitespace-nowrap text-text-2">{t`Create more`}</FieldLabel>
          </Field>
        )}
        {!chips && (
          <Button
            variant="ghost"
            onClick={onCancel}
            className={cn(!onCreateMoreChange && "ms-auto")}
          >
            <Trans>Cancel</Trans>
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          loading={pending}
          className={cn("min-w-0", chips && (onCreateMoreChange ? "ms-auto" : "flex-1"))}
        >
          <span className="truncate">
            {adding ? (deckName ? t`Add to ${deckName}` : t`Add`) : t`Save`}
          </span>
          {!chips && !st && (
            <span aria-hidden="true" className="contents">
              <Kbd tone="on-primary">⌘↵</Kbd>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
