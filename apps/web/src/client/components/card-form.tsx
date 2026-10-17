import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  CARD_LIMITS,
  CardInput,
  cardLimits,
  hasReadings,
  ImageDescription,
  modeKey,
  modeOf,
  type ReviewModeKey,
  revealsAnswer,
  termReading,
  writtenWithReading,
} from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  AlertCircle,
  Anchor,
  AudioLines,
  Check,
  Image as ImageIcon,
  Library,
  type LucideIcon,
  NotebookPen,
  Plus,
  TextQuote,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Card, DeckSummary } from "../lib/api";
import { composing } from "../lib/composing";
import { modShortcut, useDesktop } from "../lib/device";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { lastDeckId } from "../lib/last-deck";
import { deckCardsQuery, sectionsQuery, tagsQuery } from "../lib/queries";
import { captureAnalytics } from "../lib/telemetry";
import { Button } from "./button";
import { LanguageChip, ModesChip, SectionChip, TagsChip } from "./card-form-pickers";
import { acceptsPictureFile, CardPictureField, type PictureDraft } from "./card-picture-field";
import { FieldChipButton, FieldChipRow } from "./field-chip";
import { Furigana, ReadingText } from "./furigana";
import { Kbd } from "./kbd";
import { useStaticNav } from "./nav-link";
import { Checkbox } from "./ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

/** Every field as typed, trimmed, and checked against the schema the route parses with. */
export interface CardFormValues {
  deckId: string;
  term: string;
  meaning: string;
  pronunciation: string;
  example: string;
  notes: string;
  hook: string;
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

interface CardFormBase {
  /** Only decks the learner owns take a card. */
  decks: DeckSummary[] | undefined;
  /** A discarded draft being brought back. */
  draft?: CardFormDraft | undefined;
  pending?: boolean | undefined;
  onCancel: () => void;
  onSubmit: (
    values: CardFormValues,
  ) => Promise<CardFormOutcome | undefined> | CardFormOutcome | undefined;
  /** Every change, so the sheet can keep a draft to bring back. */
  onDraftChange?: ((draft: CardFormDraft) => void) | undefined;
  /** "chips" is the sheet as a drawer on touch, "whole" a dialog on a desktop. Follows the machine unless set. */
  layout?: "chips" | "whole" | undefined;
}

export interface AddCardFormProps extends CardFormBase {
  mode: "add";
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string | undefined;
  /** Preselect a section of that deck. */
  sectionId?: string | undefined;
  /** A term typed elsewhere, such as in the command menu, to start from. */
  term?: string | undefined;
  /** Whether the sheet stays open for the next card. */
  createMore?: boolean | undefined;
  onCreateMoreChange?: ((createMore: boolean) => void) | undefined;
  /** Offered when there is no deck to add to yet. */
  onCreateDeck?: (() => void) | undefined;
  /** With Create more: offered beside a notice that the picture did not go through. */
  onRetryPicture?: (() => void) | undefined;
}

/** The field the card editor opens at: the cue's, the picture, or the hook. */
export type EditFocus = "term" | "meaning" | "picture" | "hook";

export interface EditCardFormProps extends CardFormBase {
  mode: "edit";
  card: Card;
  /** Opens at this field, for rewording how the card asks or adding what did not go through. */
  focus?: EditFocus | undefined;
}

export type CardFormProps = AddCardFormProps | EditCardFormProps;

/** Under a tenth of a field left. Before that a count is noise; after it, it is the warning. */
const NEARLY_FULL = 0.9;

type Notice = { kind: "ok" | "warn" | "dup"; text: string };

/** A field a chip adds to the form. Tags, the section and how it is asked are choices instead. */
type Extra = "notes" | "example" | "pronunciation" | "source" | "picture" | "hook";
/** What a chip in the row stands for. */
type ChipKey = Extra | "tags";

const EXTRAS: Extra[] = ["notes", "example", "pronunciation", "source", "picture", "hook"];
/** The order for a deck with no cards to count, after the fields its AI may fill. */
const BASE_ORDER: ChipKey[] = ["notes", "tags", "source", "example", "pronunciation", "picture"];

/** Which field each refused value sits in, so a refusal adds that field to the form. */
const FIELD_OF: Record<string, Extra> = {
  description: "picture",
  example: "example",
  pronunciation: "pronunciation",
  notes: "notes",
  hook: "hook",
  source: "source",
};

type Holds = Partial<Record<ChipKey, unknown>>;
const holds = (card: Holds, key: ChipKey) => {
  const value = card[key];
  return Array.isArray(value)
    ? value.length > 0
    : typeof value === "string"
      ? !!value.trim()
      : !!value;
};

/**
 * The chips run from the field the deck's cards use most, so a lesson's habits lead; a deck with
 * no cards yet starts from the fields its AI may fill. Read once per deck, so nothing moves under
 * the pointer.
 */
function chipOrder(
  cards: { card: Card }[] | undefined,
  aiFields: readonly string[],
  keys: ChipKey[],
): ChipKey[] {
  const preset = [
    ...aiFields.filter((f): f is ChipKey => keys.includes(f as ChipKey)),
    ...BASE_ORDER,
  ];
  const rank = (key: ChipKey) => {
    const at = preset.indexOf(key);
    return at < 0 ? preset.length : at;
  };
  const use = new Map<ChipKey, number>();
  for (const key of keys) {
    use.set(
      key,
      cards?.filter(({ card }) => holds({ ...card, picture: card.image } as Holds, key)).length ??
        0,
    );
  }
  return [...keys].sort((a, b) => (use.get(b) ?? 0) - (use.get(a) ?? 0) || rank(a) - rank(b));
}

/**
 * One form for adding a card and changing it: term, meaning and deck, then a row of chips for
 * everything else a card holds. A chip adds its field in place, or opens its choices.
 * docs/design/library-decks-and-cards.md, "Adding and editing a card".
 */
export function CardForm(props: CardFormProps) {
  const { decks, draft, pending, onCancel, onSubmit, onDraftChange, layout } = props;
  const adding = props.mode === "add";
  const {
    deckId,
    sectionId,
    term: startTerm,
    createMore,
    onCreateMoreChange,
    onCreateDeck,
    onRetryPicture,
  }: Partial<AddCardFormProps> = adding ? props : {};
  const { card, focus }: Partial<EditCardFormProps> = adding ? {} : props;
  const { t } = useLingui();
  const st = !!useStaticNav();
  const desktop = useDesktop();
  const chips = (layout ?? (desktop ? "whole" : "chips")) === "chips";
  const queryClient = useQueryClient();

  const [term, setTerm] = useState(draft?.term ?? card?.term ?? startTerm ?? "");
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
  const [hook, setHook] = useState(draft?.hook ?? card?.hook ?? "");
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
  const text: Record<Extra, string> = {
    notes,
    example,
    pronunciation,
    source,
    hook,
    picture: picture.kind === "none" ? "" : "picture",
  };
  // A field once shown stays until the next card, even emptied to be rewritten, so it never
  // vanishes from under the caret; the fields a card already holds start shown.
  const [shown, setShown] = useState<Extra[]>(() => {
    const start = EXTRAS.filter((key) => text[key].trim());
    if (focus === "picture" || focus === "hook") {
      if (!start.includes(focus)) start.push(focus);
    }
    return start;
  });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const termRef = useRef<HTMLInputElement>(null);
  // Opened by the command menu's Enter, a second quick Enter or that Enter held down is not a submit.
  const openedWithTerm = useRef(startTerm ? performance.now() : null);
  const swallowEcho = (e: React.KeyboardEvent) => {
    const since = openedWithTerm.current;
    if (e.key !== "Enter" || since === null) return;
    if (e.repeat || performance.now() - since < ECHO_MS) e.preventDefault();
  };
  const meaningRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldOf = (key: Extra) =>
    formRef.current?.querySelector<HTMLElement>(
      `[data-extra="${key}"] :is(textarea, input:not([type=file]), button)`,
    );

  // biome-ignore lint/correctness/useExhaustiveDependencies: the field the editor opened at, once
  useEffect(() => {
    if (!focus) return;
    // After the sheet has placed its own initial focus, so this one wins.
    const timer = setTimeout(() => {
      const field =
        focus === "term"
          ? termRef.current
          : focus === "meaning"
            ? meaningRef.current
            : fieldOf(focus);
      field?.scrollIntoView({ block: "nearest" });
      // A drawer settles before any field takes focus, and the keyboard waits for a tap; overlays.md.
      if (chips) return;
      field?.focus({ preventScroll: true });
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
        field.setSelectionRange(field.value.length, field.value.length);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, []);

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
  const tagsInUse = useQuery({ ...tagsQuery, enabled: !st }).data;
  const deckLanguage = current?.defaultLanguage ?? null;
  const language = chosenLanguage ? chosenLanguage.value : deckLanguage;
  // Japanese and Chinese call a term's pronunciation its reading.
  const reads = writtenWithReading(language);
  const termDrawn = termReading({ term: term.trim(), language, pronunciation });
  const deckModes = (current?.reviewModes ?? []).map(modeKey);
  const hasPicture = picture.kind !== "none";

  const chipKeys: ChipKey[] = adding ? [...BASE_ORDER] : [...BASE_ORDER, "hook"];
  // The deck's cards as the deck page last read them; without them the AI's fields lead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: read once per deck, so chips stay put
  const order = useMemo(
    () =>
      chipOrder(
        queryClient.getQueryData(deckCardsQuery(deck).queryKey),
        current?.enrichFields ?? [],
        chipKeys,
      ),
    [deck, !!current],
  );

  const values: CardFormValues = {
    deckId: deck,
    term: term.trim(),
    meaning: meaning.trim(),
    pronunciation: pronunciation.trim(),
    example: example.trim(),
    notes: notes.trim(),
    hook: hook.trim(),
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
  const show = (key: Extra) => setShown((now) => (now.includes(key) ? now : [...now, key]));
  const addField = (key: Extra) => {
    // Rendered and focused inside the tap, since iOS raises the keyboard only for focus in a gesture.
    flushSync(() => setShown((now) => (now.includes(key) ? now : [...now, key])));
    const field = fieldOf(key);
    field?.focus({ preventScroll: true });
    field?.scrollIntoView({ block: "nearest" });
    captureAnalytics("card_field_added", { field: key, form: adding ? "add" : "edit" });
  };

  const takePastedPicture = (file: File) => {
    show("picture");
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
          pronunciation: reads
            ? t`Keep the reading under 200 characters.`
            : t`Keep the pronunciation under 200 characters.`,
          example: t`Keep the example under 2000 characters.`,
          notes: t`Keep the notes under 2000 characters.`,
          hook: t`Keep the hook under 200 characters.`,
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
      // A refused field is always on the form, since only text it holds can be refused.
      const refused = Object.keys(errors)
        .map((k) => FIELD_OF[k])
        .filter((k): k is Extra => !!k && !shown.includes(k));
      if (refused.length) setShown((now) => [...now, ...refused]);
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    setInvalid({});
    setFailure(null);
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
    // A lesson's cards share a language, a section, a source and tags, so those stay for the next card.
    setTerm("");
    setMeaning("");
    setPronunciation("");
    setExample("");
    setNotes("");
    setHook("");
    setModes(null);
    setPicture({ kind: "none" });
    setDescription("");
    setFileError(undefined);
    setShown(source.trim() ? ["source"] : []);
    termRef.current?.focus();
  };

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
        ref={meaningRef}
        maxLength={cardLimits.meaning ?? undefined}
        value={meaning}
        rows={1}
        className="min-h-11 py-2.5 leading-normal md:min-h-10"
        onChange={(e) => {
          setMeaning(e.target.value);
          clear("meaning");
        }}
        onKeyDown={submitOnEnter}
        autoComplete="off"
      />
      <FieldError>{invalid.meaning}</FieldError>
    </Field>
  );

  const deckField = noDecks ? (
    <FieldSet className="gap-1.5">
      <FieldLegend variant="label">{t`Deck`}</FieldLegend>
      <Button onClick={onCreateDeck} aria-disabled={!onCreateDeck}>
        <Plus data-icon="inline-start" aria-hidden="true" />
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
        <SelectContent />
      </Select>
      <FieldError>{invalid.deckId}</FieldError>
    </Field>
  );

  const textField = (
    key: Exclude<Extra, "picture">,
    label: string,
    value: string,
    set: (value: string) => void,
    limit: number | null,
    options: {
      long?: boolean;
      enterAdds?: boolean;
      description?: ReactNode;
    } = {},
  ) => {
    const change = (next: string) => {
      set(next);
      clear(key);
    };
    return (
      <Field key={key} data-extra={key}>
        <FieldLabel aside={roomLeft(value, limit)}>{label}</FieldLabel>
        {options.description}
        {options.long ? (
          <Textarea
            maxLength={limit ?? undefined}
            value={value}
            rows={2}
            className={options.enterAdds ? undefined : "min-h-[68px]"}
            onChange={(e) => change(e.target.value)}
            onKeyDown={options.enterAdds ? submitOnEnter : undefined}
          />
        ) : (
          <Input
            maxLength={limit ?? undefined}
            value={value}
            autoComplete="off"
            onChange={(e) => change(e.target.value)}
          />
        )}
        <FieldError>{invalid[key]}</FieldError>
      </Field>
    );
  };

  const pronunciationLabel = reads
    ? t({ message: "Reading", context: "how a term is read" })
    : t`Pronunciation`;
  // How the term and the example will read, so a reading or bracket in the wrong place shows at
  // once. It repeats what the fields hold, so assistive tech reads the fields instead.
  const exampleDrawn = hasReadings(example);
  const readingPreview = (termDrawn || exampleDrawn) && (
    <div
      key="reading-preview"
      aria-hidden="true"
      lang={language ?? undefined}
      className="grid gap-1.5 rounded-lg bg-plate-2 px-3 py-2.5"
    >
      {termDrawn && (
        <p className="text-lg font-medium text-text">
          <Furigana segments={termDrawn} lang={language ?? undefined} />
        </p>
      )}
      {exampleDrawn && (
        <p className="text-md text-text-2 [overflow-wrap:anywhere]">
          <ReadingText text={example} lang={language ?? undefined} />
        </p>
      )}
    </div>
  );
  // The preview sits under the last of the reading and the example shown, and only once one is.
  const previewAfter = shown.findLast((key) => key === "pronunciation" || key === "example");

  const extraField: Record<Extra, () => ReactNode> = {
    notes: () => textField("notes", t`Notes`, notes, setNotes, cardLimits.notes, { long: true }),
    example: () =>
      textField("example", t`Example`, example, setExample, cardLimits.example, { long: true }),
    pronunciation: () =>
      textField(
        "pronunciation",
        pronunciationLabel,
        pronunciation,
        setPronunciation,
        cardLimits.pronunciation,
      ),
    source: () => textField("source", t`Source`, source, setSource, cardLimits.source),
    hook: () =>
      // Two lines, so a long hook can be read on a phone; it is one phrase, so Enter is done with it.
      textField("hook", t`Memory hook`, hook, setHook, CARD_LIMITS.hook, {
        long: true,
        enterAdds: true,
        description: (
          <FieldDescription>{t`A short phrase that helps you remember it.`}</FieldDescription>
        ),
      }),
    picture: () => (
      <div key="picture" data-extra="picture" className="grid gap-1.5">
        <span className="text-sm font-medium text-text-2">
          <Trans>Picture</Trans>
        </span>
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
      </div>
    ),
  };

  const chipOf: Record<Extra, { icon: LucideIcon; label: string }> = {
    notes: { icon: NotebookPen, label: t`Notes` },
    example: { icon: TextQuote, label: t`Example` },
    pronunciation: { icon: AudioLines, label: pronunciationLabel },
    source: { icon: Library, label: t`Source` },
    picture: { icon: ImageIcon, label: t`Picture` },
    hook: { icon: Anchor, label: t`Memory hook` },
  };
  const chipFor = (key: ChipKey) => {
    if (key === "tags")
      return (
        <TagsChip
          key="tags"
          value={tags}
          inUse={tagsInUse}
          invalid={!!invalid.tags}
          onTagAdded={(via, inUse) => captureAnalytics("tag_added", { via, in_use: inUse })}
          onChange={(next) => {
            setTags(next);
            clear("tags");
          }}
        />
      );
    if (shown.includes(key)) return null;
    const { icon, label } = chipOf[key];
    return (
      <FieldChipButton key={key} icon={icon} onClick={() => addField(key)}>
        {label}
      </FieldChipButton>
    );
  };

  return (
    <form
      ref={formRef}
      className="grid min-w-0 gap-4"
      noValidate
      onKeyDownCapture={swallowEcho}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        // ⌘ Enter adds from any field.
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
      {termField}
      {meaningField}
      {deckField}
      {shown.flatMap((key) => [extraField[key](), key === previewAfter && readingPreview])}
      <FieldChipRow label={t`More about this card`} className={chips ? "-mx-4 px-4" : "-mx-5 px-5"}>
        {sections && sections.length > 0 && (
          <SectionChip sections={sections} value={section} onChange={setSection} />
        )}
        {order.map(chipFor)}
        {!adding && (
          <LanguageChip value={language} onChange={(value) => setChosenLanguage({ value })} />
        )}
        <ModesChip
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
          invalid={!!invalid.reviewModes}
        />
      </FieldChipRow>
      {/* A choice's refusal has no field to sit under, so it sits under the row of chips. */}
      <FieldError className="-mt-3">{invalid.tags ?? invalid.reviewModes}</FieldError>

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
              <Kbd tone="on-primary">{modShortcut("↵")}</Kbd>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

const ECHO_MS = 600;

/** Enter adds the card from a one-line field; Shift Enter breaks the line. */
function submitOnEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key !== "Enter" || e.shiftKey || e.defaultPrevented || composing(e)) return;
  if (e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  e.currentTarget.form?.requestSubmit();
}
