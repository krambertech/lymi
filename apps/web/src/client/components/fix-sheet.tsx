import { Trans, useLingui } from "@lingui/react/macro";
import { CARD_LIMITS, cardLimits, type DraftCard, type FixInput, headword } from "@lymi/core";
import { cn } from "cn";
import { Anchor, ChevronRight, ImagePlus, Pencil, SquarePen, TextCursorInput } from "lucide-react";
import { type ComponentProps, type ReactNode, type Ref, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ApiError, type QueueItem, type ReviewOffer } from "../lib/api";
import { useOverlayShape } from "../lib/device";
import { focusFirstInvalid } from "../lib/form";
import { useCardFix } from "../lib/use-card-fix";
import { Button, IconButton } from "./button";
import type { EditFocus } from "./card-form";
import { SourceChip } from "./chip";
import { InlineError } from "./inline-error";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type Pair = [DraftCard, DraftCard];
type Offer<C extends ReviewOffer["cause"]> = Extract<ReviewOffer, { cause: C }>;

interface Props {
  /** The card on screen; the sheet is open while `open` says so. */
  item: QueueItem | null;
  /** The fix drafted for it. */
  offer: ReviewOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The fix landed on the card; the sheet closes with its toast. */
  onFixed?: ((cause: FixInput["cause"]) => void) | undefined;
  /** Opens the card editor at a field, or at the top without one. */
  onEdit: (focus?: EditFocus) => void;
  /** The learner says the cause is wrong. The sheet closes; the caller records it. */
  onDismiss: () => void;
  /** Where focus goes on closing, since the offer that opened the sheet leaves with it. */
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
}

/**
 * The fix a diagnosis drafted, for the learner to accept, change or leave. A drawer on touch and
 * a centred dialog on a desktop, with the title pinned and the actions at the foot. Nothing on
 * the card changes until the primary is pressed, and Undo in the toast reverses it.
 */
export function FixSheet({
  item,
  offer,
  open,
  onOpenChange,
  onFixed,
  onEdit,
  onDismiss,
  finalFocus,
}: Props) {
  // Held while the sheet closes, so its contents do not vanish mid-animation.
  const [shown, setShown] = useState(item && offer ? { item, offer } : null);
  if (item && offer && (item !== shown?.item || offer !== shown.offer)) setShown({ item, offer });
  const titleId = useId();
  return (
    <Dialog open={open && !!offer} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        finalFocus={finalFocus}
        // The title, so the first stop is never a control that dismisses the fix, and a drawer
        // settles before any field asks for the keyboard, overlays.md.
        initialFocus={() => document.getElementById(titleId)}
      >
        {shown && (
          <FixBody
            key={shown.offer.diagnosisId}
            item={shown.item}
            offer={shown.offer}
            titleId={titleId}
            onClose={() => onOpenChange(false)}
            onFixed={onFixed}
            onEdit={onEdit}
            onDismiss={onDismiss}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface BodyProps {
  item: QueueItem;
  offer: ReviewOffer;
  titleId: string;
  onClose: () => void;
  onFixed?: ((cause: FixInput["cause"]) => void) | undefined;
  onEdit: (focus?: EditFocus) => void;
  onDismiss: () => void;
}

function FixBody({ item, offer, titleId, onClose, onFixed, onEdit, onDismiss }: BodyProps) {
  const accept = useCardFix();
  const [failure, setFailure] = useState<"stale" | "unreachable" | null>(null);
  // The menu's "Add a memory hook" turns the sheet into the hook's own, with nothing drafted.
  const [writingHook, setWritingHook] = useState(false);
  const frame = {
    titleId,
    pending: accept.isPending,
    failure,
    onClose,
    onEdit,
    onDismiss,
    submit: (input: FixInput) => {
      setFailure(null);
      accept.mutate(
        { id: offer.diagnosisId, input },
        {
          onSuccess: () => {
            onClose();
            onFixed?.(input.cause);
          },
          onError: (error) =>
            setFailure(error instanceof ApiError && error.status === 409 ? "stale" : "unreachable"),
        },
      );
    },
  };
  switch (offer.cause) {
    case "confused_pair":
      return <PairFix item={item} offer={offer} frame={frame} />;
    case "two_things":
      return <SplitFix item={item} offer={offer} frame={frame} />;
    case "several_answers":
      return <CueFix item={item} offer={offer} frame={frame} />;
    case "no_anchor":
      return <HookFix item={item} drafted={offer.draft.hook} frame={frame} />;
    default:
      return writingHook ? (
        <HookFix item={item} drafted={null} frame={frame} focusOnMount />
      ) : (
        <ChangeMenu
          item={item}
          frame={frame}
          onHook={() => {
            // Inside the tap, so iOS raises the keyboard for the field this row opened.
            flushSync(() => setWritingHook(true));
          }}
        />
      );
  }
}

interface FrameState {
  titleId: string;
  pending: boolean;
  failure: "stale" | "unreachable" | null;
  onClose: () => void;
  onEdit: (focus?: EditFocus) => void;
  onDismiss: () => void;
  submit: (input: FixInput) => void;
}

interface FrameProps {
  frame: FrameState;
  title: ReactNode;
  why: ReactNode;
  /** The fix's own button; none for a card with no clear reason. */
  primary?: ReactNode | undefined;
  /** The why names a cause the learner can say is wrong; not for a hook or a card with no clear reason. */
  dismissable?: boolean | undefined;
  /** Where the card editor opens once the fix no longer fits. */
  editAt?: EditFocus | undefined;
  onSubmit?: (() => void) | undefined;
  /** A problem with what the learner sent, shown with any failure in one live line. */
  problem?: string | null | undefined;
  formRef?: Ref<HTMLFormElement> | undefined;
  children: ReactNode;
}

/** Title and why, the fix, one live line for what went wrong, and the actions at the foot. */
function Frame({
  frame,
  title,
  why,
  primary,
  dismissable = false,
  editAt,
  onSubmit,
  problem,
  formRef,
  children,
}: FrameProps) {
  const { t } = useLingui();
  const stale = frame.failure === "stale";
  const failure =
    frame.failure === "stale"
      ? t`This card changed after Lymi drafted this fix, so it no longer fits.`
      : frame.failure === "unreachable"
        ? t`Couldn’t change the card. Check your connection and try again.`
        : null;
  return (
    <form
      ref={formRef}
      noValidate
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!frame.pending && !stale) onSubmit?.();
      }}
    >
      <DialogTitle id={frame.titleId} tabIndex={-1} className="text-balance">
        {title}
      </DialogTitle>
      <DialogDescription className="-mt-2 text-pretty">{why}</DialogDescription>
      {/* Under the claim it answers, and quiet: a third button in the foot would crowd the phone. */}
      {dismissable && (
        <button
          type="button"
          onClick={frame.onDismiss}
          className="-mt-4 -mb-2 min-h-11 justify-self-start text-sm text-text-2 underline decoration-edge-2 underline-offset-3 transition-colors hoverable:-mt-3 hoverable:min-h-8 hoverable:hover:text-text hoverable:hover:decoration-current"
        >
          <Trans>That’s not it</Trans>
        </button>
      )}
      {children}
      <p role="status" className="text-sm empty:hidden">
        {(problem ?? failure) && <InlineError>{problem ?? failure}</InlineError>}
      </p>
      <Actions
        onClose={frame.onClose}
        primary={
          // A fix that no longer fits cannot be pressed again; the card itself can be changed.
          stale ? (
            <Button variant="primary" onClick={() => frame.onEdit(editAt)}>
              <Trans>Edit the card</Trans>
            </Button>
          ) : (
            primary && (
              <Button
                variant="primary"
                type="submit"
                loading={frame.pending}
                aria-disabled={frame.pending}
              >
                {primary}
              </Button>
            )
          )
        }
      />
    </form>
  );
}

/** Not now, and the fix; pinned to the foot, the primary on top on touch. */
function Actions({ primary, onClose }: { primary: ReactNode; onClose: () => void }) {
  const shape = useOverlayShape(true);
  return (
    <DialogFooter
      className={cn(
        "sticky z-10 bg-plate",
        shape === "desktop"
          ? "-bottom-5 -mx-5 -mb-5 px-5 pt-3 pb-5"
          : "bottom-0 -mx-4 -mb-5 px-4 pt-3 pb-5",
      )}
    >
      <Button variant="ghost" onClick={onClose}>
        <Trans>Not now</Trans>
      </Button>
      {primary}
    </DialogFooter>
  );
}

const blank = (card: DraftCard) => !card.term.trim() || !card.meaning.trim();

/** Drafted cards the learner can edit, checked for empty fields when the fix is pressed. */
function useDraftCards(drafts: Pair) {
  const { t } = useLingui();
  const [cards, setCards] = useState<Pair>(drafts);
  const [checked, setChecked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const incomplete = cards.some(blank);
  return {
    cards,
    setCards,
    checked,
    formRef,
    problem: checked && incomplete ? t`Give each card a term and a meaning.` : null,
    /** The cards to send, or null after marking the empty fields and focusing the first. */
    ready: (): Pair | null => {
      if (!incomplete) return cards;
      setChecked(true);
      focusFirstInvalid(formRef.current);
      return null;
    },
  };
}

function PairFix({
  item,
  offer,
  frame,
}: {
  item: QueueItem;
  offer: Offer<"confused_pair">;
  frame: FrameState;
}) {
  const { card, mode } = item;
  const drafted = useDraftCards(offer.draft.cards);
  const term = card.term;
  const language = card.language ?? undefined;
  const other = offer.other;
  const otherTerm = other.term;
  const title = headword(term);
  const otherTitle = headword(otherTerm);
  return (
    <Frame
      frame={frame}
      formRef={drafted.formRef}
      title={
        <Trans>
          <span lang={language}>{title}</span> and{" "}
          <span lang={other.language ?? undefined}>{otherTitle}</span>
        </Trans>
      }
      why={<Trans>“{title}” is often forgotten, maybe because the two are easy to mix up.</Trans>}
      primary={<Trans>Add 2 cards</Trans>}
      dismissable
      problem={drafted.problem}
      onSubmit={() => {
        const cards = drafted.ready();
        if (cards) frame.submit({ cause: "confused_pair", cards });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Compared term={term} meaning={card.meaning} language={language} />
        <Compared term={otherTerm} meaning={other.meaning} language={other.language ?? undefined} />
      </div>
      <DraftCards
        heading={<Trans>Two cards that tell them apart</Trans>}
        drafts={offer.draft.cards}
        cards={drafted.cards}
        checked={drafted.checked}
        cueFirst={mode.cue === "term" ? "term" : "meaning"}
        language={language}
        onChange={drafted.setCards}
      />
    </Frame>
  );
}

function SplitFix({
  item,
  offer,
  frame,
}: {
  item: QueueItem;
  offer: Offer<"two_things">;
  frame: FrameState;
}) {
  const { card, mode } = item;
  const drafted = useDraftCards(offer.draft.cards);
  return (
    <Frame
      frame={frame}
      formRef={drafted.formRef}
      title={<Trans>Split into 2 cards</Trans>}
      why={
        <Trans>
          This card asks for two things at once, so remembering half still counts as a miss.
        </Trans>
      }
      primary={<Trans>Split into 2 cards</Trans>}
      dismissable
      problem={drafted.problem}
      onSubmit={() => {
        const cards = drafted.ready();
        if (cards) frame.submit({ cause: "two_things", cards });
      }}
    >
      <DraftCards
        drafts={offer.draft.cards}
        cards={drafted.cards}
        checked={drafted.checked}
        cueFirst={mode.cue === "term" ? "term" : "meaning"}
        language={card.language ?? undefined}
        numbered
        onChange={drafted.setCards}
      />
      <p className="text-sm text-muted">
        <Trans>Card 1 keeps this card’s history and notes. Card 2 starts as new.</Trans>
      </p>
    </Frame>
  );
}

function CueFix({
  item,
  offer,
  frame,
}: {
  item: QueueItem;
  offer: Offer<"several_answers">;
  frame: FrameState;
}) {
  const { t } = useLingui();
  const { card } = item;
  const { field, otherAnswer } = offer.draft;
  const language = card.language ?? undefined;
  const [cue, setCue] = useState(offer.draft.text);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = (field === "term" ? card.term : card.meaning) ?? "";
  const term = field === "term";
  return (
    <Frame
      frame={frame}
      title={<Trans>Make the question clearer</Trans>}
      why={
        <Trans>
          “{current}” fits more than one answer, so you can’t tell which one the card wants.
        </Trans>
      }
      primary={<Trans>Change the question</Trans>}
      dismissable
      onSubmit={() => {
        if (!cue.trim()) {
          setError(term ? t`Type the term.` : t`Type the meaning.`);
          input.current?.focus();
          return;
        }
        frame.submit({ cause: "several_answers", text: cue.trim() });
      }}
    >
      <p className="rounded-md bg-plate-2 px-3 py-2.5 text-sm text-text-2">
        <Trans>
          Another right answer:{" "}
          <span lang={language} className="font-medium text-text">
            {otherAnswer}
          </span>
        </Trans>
      </p>
      <Field invalid={!!error}>
        <div className="flex min-h-[17px] flex-wrap items-center gap-2">
          <FieldLabel>{term ? t`Term` : t`Meaning`}</FieldLabel>
          {cue === offer.draft.text && <SourceChip source="ai" size="xs" />}
        </div>
        <Input
          ref={input}
          value={cue}
          maxLength={(term ? cardLimits.term : cardLimits.meaning) ?? undefined}
          lang={term ? language : undefined}
          onChange={(e) => {
            setCue(e.target.value);
            setError(null);
          }}
          autoComplete="off"
          {...(term ? { autoCapitalize: "none", spellCheck: false } : {})}
          enterKeyHint="done"
        />
        <FieldError>{error}</FieldError>
      </Field>
    </Frame>
  );
}

/**
 * A memory hook for the card, drafted by the AI or written from nothing. It keeps the AI's badge
 * until a word of it changes.
 */
function HookFix({
  item,
  drafted,
  frame,
  focusOnMount = false,
}: {
  item: QueueItem;
  drafted: string | null;
  frame: FrameState;
  /** Take the caret at once, for a learner who chose to write a hook of their own. */
  focusOnMount?: boolean | undefined;
}) {
  const { t } = useLingui();
  const { card, mode } = item;
  const [hook, setHook] = useState(drafted ?? "");
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const focused = useRef(false);
  const focusField = (node: HTMLTextAreaElement | null) => {
    field.current = node;
    if (!node || !focusOnMount || focused.current) return;
    focused.current = true;
    node.focus({ preventScroll: true });
  };
  const term = headword(card.term);
  const cue = mode.cue === "meaning" ? (card.meaning ?? card.term) : card.term;
  const cueLanguage = mode.cue === "term" ? (card.language ?? undefined) : undefined;
  const picture = mode.cue === "image";
  const submit = () => {
    const text = hook.trim();
    if (!text) {
      setError(t`Write a hook.`);
      field.current?.focus();
      return;
    }
    frame.submit({ cause: "no_anchor", hook: text });
  };
  return (
    <Frame
      frame={frame}
      title={
        <Trans>
          A memory hook for <span lang={card.language ?? undefined}>{term}</span>
        </Trans>
      }
      why={
        drafted === null ? (
          picture ? (
            <Trans>Think of it when the card shows its picture.</Trans>
          ) : (
            <Trans>
              Think of it when the card shows “<span lang={cueLanguage}>{cue}</span>”.
            </Trans>
          )
        ) : picture ? (
          <Trans>
            Think of it when the card shows its picture. Change anything that doesn’t help.
          </Trans>
        ) : (
          <Trans>
            Think of it when the card shows “<span lang={cueLanguage}>{cue}</span>”. Change anything
            that doesn’t help.
          </Trans>
        )
      }
      primary={drafted === null ? <Trans>Save hook</Trans> : <Trans>Add hook</Trans>}
      editAt="hook"
      onSubmit={submit}
    >
      <Field invalid={!!error}>
        <div className="flex min-h-[17px] flex-wrap items-center gap-2">
          <FieldLabel>{t`Memory hook`}</FieldLabel>
          {drafted !== null && hook === drafted && (
            <SourceChip source="ai" field="hook" size="xs" />
          )}
        </div>
        <Textarea
          ref={focusField}
          rows={2}
          value={hook}
          maxLength={CARD_LIMITS.hook}
          placeholder={drafted === null ? t`A sound-alike, or something to picture` : undefined}
          onChange={(e) => {
            setHook(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            // A hook is one phrase, so Enter keeps it; Shift Enter still breaks the line.
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          autoComplete="off"
          enterKeyHint="done"
        />
        <FieldDescription>
          <Trans>
            Peek at it before you reveal the card, or show it after. After a peek, you can’t choose
            Easy.
          </Trans>
        </FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>
    </Frame>
  );
}

function ChangeMenu({
  item,
  frame,
  onHook,
}: {
  item: QueueItem;
  frame: FrameState;
  onHook: () => void;
}) {
  const { t } = useLingui();
  const { card, mode } = item;
  const cueField: EditFocus = mode.cue === "image" ? "picture" : mode.cue;
  return (
    <Frame
      frame={frame}
      title={<Trans>Ask it another way</Trans>}
      why={
        <Trans>
          Lymi can’t tell why you keep forgetting this card. Changing how it asks often helps.
        </Trans>
      }
    >
      <ul aria-label={t`Ways to change the card`} className="-mx-2 grid gap-1">
        {!card.hook && (
          <ChangeRow
            icon={<Anchor />}
            title={<Trans>Add a memory hook</Trans>}
            detail={<Trans>A short phrase that helps you remember it</Trans>}
            onClick={onHook}
          />
        )}
        <ChangeRow
          icon={<TextCursorInput />}
          title={<Trans>Make the question clearer</Trans>}
          detail={<Trans>Add a word so only one answer fits</Trans>}
          onClick={() => frame.onEdit(cueField)}
        />
        {!card.image && (
          <ChangeRow
            icon={<ImagePlus />}
            title={<Trans>Add a picture</Trans>}
            detail={<Trans>Something to see as well as read</Trans>}
            onClick={() => frame.onEdit("picture")}
          />
        )}
        <ChangeRow
          icon={<SquarePen />}
          title={<Trans>Edit the card</Trans>}
          detail={<Trans>Change anything on it</Trans>}
          onClick={() => frame.onEdit()}
        />
      </ul>
    </Frame>
  );
}

/** One way to change the card: the whole row is the button, ending in a plain chevron like the offer's. */
function ChangeRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  detail: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex min-h-16 w-full items-center gap-4 rounded-sm px-2 py-2.5 text-start transition-[background-color] duration-150 ease-out hoverable:hover:bg-hover"
      >
        <span
          aria-hidden="true"
          className="edge-inset grid size-10 shrink-0 place-items-center rounded-full text-text-2 [&_svg]:size-[18px]"
        >
          {icon}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-md font-medium text-text">{title}</span>
          <span className="text-sm text-muted">{detail}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-faint transition-colors duration-150 hoverable:group-hover:text-muted rtl:-scale-x-100"
        />
      </button>
    </li>
  );
}

/** One of the two cards a confusion is between, as the learner has it now. */
function Compared({
  term,
  meaning,
  language,
}: {
  term: string;
  meaning: string | null;
  language: string | undefined;
}) {
  return (
    <div className="grid min-w-0 content-start gap-1 rounded-md bg-plate-2 px-3 py-2.5">
      <p
        lang={language}
        className="hyphenate text-lg font-medium text-text [overflow-wrap:anywhere]"
      >
        {term}
      </p>
      {meaning && (
        <p className="hyphenate text-sm text-text-2 [overflow-wrap:anywhere]">{meaning}</p>
      )}
    </div>
  );
}

interface DraftCardsProps {
  heading?: ReactNode | undefined;
  /** What the AI wrote, so a card left as drafted keeps its badge. */
  drafts: Pair;
  cards: Pair;
  /** The fix was pressed, so an empty field is marked. */
  checked: boolean;
  cueFirst: "term" | "meaning";
  language: string | undefined;
  numbered?: boolean | undefined;
  onChange: (cards: Pair) => void;
}

/** The two cards the AI drafted, each shown as review will ask it and editable in place. */
function DraftCards({
  heading,
  drafts,
  cards,
  checked,
  cueFirst,
  language,
  numbered = false,
  onChange,
}: DraftCardsProps) {
  const headingId = useId();
  const set = (index: 0 | 1, next: DraftCard) =>
    onChange(index === 0 ? [next, cards[1]] : [cards[0], next]);
  return (
    <section aria-labelledby={heading ? headingId : undefined} className="grid gap-2">
      {heading && (
        <h3 id={headingId} className="text-sm font-medium text-text-2">
          {heading}
        </h3>
      )}
      <ol className="grid gap-2">
        {([0, 1] as const).map((index) => (
          <DraftCardItem
            key={index}
            index={index}
            numbered={numbered}
            draft={drafts[index]}
            card={cards[index]}
            checked={checked}
            cueFirst={cueFirst}
            language={language}
            onChange={(next) => set(index, next)}
          />
        ))}
      </ol>
    </section>
  );
}

function DraftCardItem({
  index,
  numbered,
  draft,
  card,
  checked,
  cueFirst,
  language,
  onChange,
}: {
  index: 0 | 1;
  numbered: boolean;
  draft: DraftCard;
  card: DraftCard;
  checked: boolean;
  cueFirst: "term" | "meaning";
  language: string | undefined;
  onChange: (card: DraftCard) => void;
}) {
  const { t } = useLingui();
  const [editing, setEditing] = useState(false);
  const termInput = useRef<HTMLInputElement>(null);
  const n = index + 1;
  const untouched = card.term === draft.term && card.meaning === draft.meaning;
  const draftTerm = card.term;
  const term = { text: card.term, lang: language };
  const meaning = { text: card.meaning, lang: undefined };
  const [cue, target] = cueFirst === "meaning" ? [meaning, term] : [term, meaning];
  return (
    <li className="edge flex min-w-0 items-start gap-3 rounded-md bg-plate px-3 py-2.5">
      {numbered && (
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-plate-2 text-xs font-medium tabular-nums text-text-2"
        >
          {n}
        </span>
      )}
      <div className="grid min-w-0 flex-1 gap-1">
        {numbered && <span className="sr-only">{t`Card ${n}`}</span>}
        {editing ? (
          <div className="grid gap-3 py-1">
            <Field invalid={checked && !card.term.trim()}>
              <FieldLabel>{t`Term`}</FieldLabel>
              <Input
                ref={termInput}
                // Both cards have a Term and a Meaning, so each says which card it is.
                aria-label={t`Term, card ${n}`}
                value={card.term}
                lang={language}
                maxLength={cardLimits.term ?? undefined}
                onChange={(e) => onChange({ ...card, term: e.target.value })}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
            <Field invalid={checked && !card.meaning.trim()}>
              <FieldLabel>{t`Meaning`}</FieldLabel>
              <Textarea
                rows={1}
                aria-label={t`Meaning, card ${n}`}
                className="min-h-11 py-2.5 leading-normal md:min-h-10"
                value={card.meaning}
                maxLength={cardLimits.meaning ?? undefined}
                onChange={(e) => onChange({ ...card, meaning: e.target.value })}
                autoComplete="off"
              />
            </Field>
          </div>
        ) : (
          <>
            <p
              lang={cue.lang}
              className="hyphenate whitespace-pre-line text-sm text-muted [overflow-wrap:anywhere]"
            >
              {cue.text}
            </p>
            <p
              lang={target.lang}
              className="hyphenate whitespace-pre-line text-md font-medium text-text [overflow-wrap:anywhere]"
            >
              {target.text}
            </p>
          </>
        )}
      </div>
      <div className="-me-1.5 -mt-0.5 flex shrink-0 items-center gap-1">
        {untouched && <SourceChip source="ai" size="xs" />}
        {!editing && (
          <IconButton
            size="sm"
            label={numbered ? t`Edit card ${n}` : t`Edit “${draftTerm}”`}
            onClick={() => {
              // Inside the tap, so iOS raises the keyboard for the term.
              flushSync(() => setEditing(true));
              termInput.current?.focus();
            }}
          >
            <Pencil />
          </IconButton>
        )}
      </div>
    </li>
  );
}
