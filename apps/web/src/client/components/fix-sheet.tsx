import { Trans, useLingui } from "@lingui/react/macro";
import { cardLimits, type FixInput } from "@lymi/core";
import { cn } from "cn";
import { ChevronRight, ImagePlus, Pencil, SquarePen, TextCursorInput } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { ApiError, type QueueItem, type ReviewOffer } from "../lib/api";
import { useOverlayShape } from "../lib/device";
import { useCardFix } from "../lib/use-card-fix";
import { Button, IconButton } from "./button";
import { SourceChip } from "./chip";
import { InlineError } from "./inline-error";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./ui/dialog";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

/** Where the card editor opens: at the cue, at the picture, or at the top. */
export type EditFocus = "term" | "meaning" | "picture" | null;

interface Props {
  /** The card on screen and the fix drafted for it; the sheet is open while `open` says so. */
  item: QueueItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the card editor, for a card with no clear reason. */
  onEdit: (focus: EditFocus) => void;
}

type DraftCard = { term: string; meaning: string };

/**
 * The fix a diagnosis drafted, for the learner to accept, change or leave. A drawer on touch and
 * a centred dialog on a desktop, with the title pinned and the actions at the foot. Nothing on
 * the card changes until the primary is pressed, and Undo in the toast reverses it.
 */
export function FixSheet({ item, open, onOpenChange, onEdit }: Props) {
  // Held while the sheet closes, so its contents do not vanish mid-animation.
  const [shown, setShown] = useState(item);
  if (item?.offer && item !== shown) setShown(item);
  const offer = shown?.offer;
  return (
    <Dialog open={open && !!offer} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        {shown && offer && (
          <FixBody
            key={offer.diagnosisId}
            item={shown}
            offer={offer}
            open={open}
            onClose={() => onOpenChange(false)}
            onEdit={onEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface BodyProps {
  item: QueueItem;
  offer: ReviewOffer;
  open: boolean;
  onClose: () => void;
  onEdit: (focus: EditFocus) => void;
}

function FixBody({ item, offer, open, onClose, onEdit }: BodyProps) {
  const { t } = useLingui();
  const accept = useCardFix();
  const [failure, setFailure] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const { card, mode } = item;
  const term = card.term;
  const language = card.language ?? undefined;
  // What the card shows first in review, so a drafted card reads the way it will be asked.
  const cueFirst: "term" | "meaning" = mode.cue === "term" ? "term" : "meaning";

  const [pair, setPair] = useState<[DraftCard, DraftCard] | null>(
    offer.cause === "confused_pair" || offer.cause === "two_things" ? offer.draft.cards : null,
  );
  const [cue, setCue] = useState(offer.cause === "several_answers" ? offer.draft.text : "");

  const submit = (input: FixInput) => {
    setFailure(null);
    accept.mutate(
      { id: offer.diagnosisId, input },
      {
        onSuccess: onClose,
        onError: (error) =>
          setFailure(
            error instanceof ApiError && error.status === 409
              ? t`This card changed since Lymi looked at it, so the fix no longer fits.`
              : t`Couldn’t change the card. Check your connection and try again.`,
          ),
      },
    );
  };

  const cardsValid = (cards: [DraftCard, DraftCard]) => {
    const empty = cards.some((c) => !c.term.trim() || !c.meaning.trim());
    setInvalid(empty ? t`Give each card a term and a meaning.` : null);
    return !empty;
  };

  let title: ReactNode;
  let why: ReactNode;
  let body: ReactNode;
  let primary: ReactNode = null;
  let onSubmit: (() => void) | null = null;

  switch (offer.cause) {
    case "confused_pair": {
      const other = offer.other;
      const otherTerm = other?.term ?? "";
      const otherLanguage = other?.language ?? undefined;
      title = (
        <Trans>
          <span lang={language}>{term}</span> and <span lang={otherLanguage}>{otherTerm}</span>
        </Trans>
      );
      why = <Trans>“{term}” keeps slipping, likely because the two get mixed up.</Trans>;
      body = (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Compared term={term} meaning={card.meaning} language={language} />
            <Compared term={otherTerm} meaning={other?.meaning ?? null} language={otherLanguage} />
          </div>
          {pair && (
            <DraftCards
              heading={<Trans>Two cards that tell them apart</Trans>}
              drafts={offer.draft.cards}
              cards={pair}
              cueFirst={cueFirst}
              language={language}
              onChange={setPair}
            />
          )}
        </>
      );
      primary = <Trans>Add 2 cards</Trans>;
      onSubmit = () => {
        if (pair && cardsValid(pair)) submit({ cause: "confused_pair", cards: pair });
      };
      break;
    }
    case "two_things":
      title = <Trans>Split into 2 cards</Trans>;
      why = (
        <Trans>
          This card asks for two things at once, so remembering half still counts as a miss.
        </Trans>
      );
      body = pair && (
        <>
          <DraftCards
            drafts={offer.draft.cards}
            cards={pair}
            cueFirst={cueFirst}
            language={language}
            numbered
            onChange={setPair}
          />
          <p className="text-sm text-muted">
            <Trans>Card 1 keeps this card’s history and notes. Card 2 starts as new.</Trans>
          </p>
        </>
      );
      primary = <Trans>Split into 2 cards</Trans>;
      onSubmit = () => {
        if (pair && cardsValid(pair)) submit({ cause: "two_things", cards: pair });
      };
      break;
    case "several_answers": {
      const { field, otherAnswer } = offer.draft;
      const current = (field === "term" ? card.term : card.meaning) ?? "";
      const limit = (field === "term" ? cardLimits.term : cardLimits.meaning) ?? undefined;
      title = <Trans>Make the question clearer</Trans>;
      why = (
        <Trans>
          “{current}” fits more than one answer, so the card can’t tell which one you mean.
        </Trans>
      );
      body = (
        <>
          <p className="rounded-md bg-plate-2 px-3 py-2.5 text-sm text-text-2">
            <Trans>
              Also a right answer:{" "}
              <span lang={language} className="font-medium text-text">
                {otherAnswer}
              </span>
            </Trans>
          </p>
          <Field>
            <div className="flex min-h-[17px] flex-wrap items-center gap-2">
              <FieldLabel>{field === "term" ? t`Term` : t`Meaning`}</FieldLabel>
              {cue === offer.draft.text && <SourceChip source="ai" size="xs" />}
            </div>
            <Input
              value={cue}
              maxLength={limit}
              lang={field === "term" ? language : undefined}
              onChange={(e) => {
                setCue(e.target.value);
                setInvalid(null);
              }}
              autoComplete="off"
              enterKeyHint="done"
              aria-invalid={invalid ? true : undefined}
            />
            <FieldError>{invalid}</FieldError>
          </Field>
        </>
      );
      primary = <Trans>Change the question</Trans>;
      onSubmit = () => {
        if (!cue.trim()) {
          setInvalid(field === "term" ? t`Type the term.` : t`Type the meaning.`);
          return;
        }
        submit({ cause: "several_answers", text: cue.trim() });
      };
      break;
    }
    default: {
      title = <Trans>Ask it another way</Trans>;
      why = (
        <Trans>
          Lymi can’t tell why this card slips. Changing how it asks usually helps more than another
          round of the same.
        </Trans>
      );
      const cueField: EditFocus = mode.cue === "image" ? "picture" : mode.cue;
      body = (
        <ul aria-label={t`Ways to change the card`} className="-mx-2 grid gap-1">
          <ChangeRow
            icon={<TextCursorInput />}
            title={<Trans>Make the question clearer</Trans>}
            detail={<Trans>Add a word so only one answer fits</Trans>}
            onClick={() => onEdit(cueField)}
          />
          {!card.image && (
            <ChangeRow
              icon={<ImagePlus />}
              title={<Trans>Add a picture</Trans>}
              detail={<Trans>Something to see as well as read</Trans>}
              onClick={() => onEdit("picture")}
            />
          )}
          <ChangeRow
            icon={<SquarePen />}
            title={<Trans>Edit the card</Trans>}
            detail={<Trans>Change anything on it</Trans>}
            onClick={() => onEdit(null)}
          />
        </ul>
      );
    }
  }

  return (
    <form
      noValidate
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (accept.isPending || !open) return;
        onSubmit?.();
      }}
    >
      <DialogTitle className="text-balance">{title}</DialogTitle>
      <DialogDescription className="-mt-2 text-pretty">{why}</DialogDescription>
      {body}
      {invalid && offer.cause !== "several_answers" && (
        <p role="status" className="text-sm">
          <InlineError>{invalid}</InlineError>
        </p>
      )}
      {failure && (
        <p role="status" className="text-sm">
          <InlineError>{failure}</InlineError>
        </p>
      )}
      <Actions pending={accept.isPending} primary={primary} onClose={onClose} />
    </form>
  );
}

/** Not now, and the fix; pinned to the foot, the primary on top on touch. */
function Actions({
  pending,
  primary,
  onClose,
}: {
  pending: boolean;
  primary: ReactNode;
  onClose: () => void;
}) {
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
      {primary && (
        <Button variant="primary" type="submit" loading={pending} aria-disabled={pending}>
          {primary}
        </Button>
      )}
    </DialogFooter>
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
  drafts: readonly [DraftCard, DraftCard];
  cards: [DraftCard, DraftCard];
  cueFirst: "term" | "meaning";
  language: string | undefined;
  numbered?: boolean | undefined;
  onChange: (cards: [DraftCard, DraftCard]) => void;
}

/** The two cards the AI drafted, each shown as review will ask it and editable in place. */
function DraftCards({
  heading,
  drafts,
  cards,
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
  cueFirst,
  language,
  onChange,
}: {
  index: 0 | 1;
  numbered: boolean;
  draft: DraftCard;
  card: DraftCard;
  cueFirst: "term" | "meaning";
  language: string | undefined;
  onChange: (card: DraftCard) => void;
}) {
  const { t } = useLingui();
  const [editing, setEditing] = useState(false);
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
            <Field>
              <FieldLabel>{t`Term`}</FieldLabel>
              <Input
                value={card.term}
                lang={language}
                maxLength={cardLimits.term ?? undefined}
                onChange={(e) => onChange({ ...card, term: e.target.value })}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
            <Field>
              <FieldLabel>{t`Meaning`}</FieldLabel>
              <Textarea
                rows={1}
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
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </IconButton>
        )}
      </div>
    </li>
  );
}
