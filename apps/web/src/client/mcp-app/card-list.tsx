import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { productLinks, type ViewCard } from "../../shared/mcp-app";
import { Button } from "../components/button";
import { SourceChip } from "../components/chip";
import { CardEditor } from "./card-editor";
import { useHost } from "./host";

export type ListedCard = ViewCard & { deckName?: string | undefined };

interface Props {
  cards: ListedCard[];
  /** The list's accessible name. */
  label: string;
  /** Show each card's deck, for a list that crosses decks. */
  showDeck?: boolean | undefined;
  onSaved?: ((card: ViewCard) => void) | undefined;
}

/**
 * Cards as rows a learner can open: open shows the card and tells the assistant which card the
 * learner means; Edit turns the row into the editor. One row is open at a time.
 */
export function CardList({ cards, label, showDeck = false, onSaved }: Props) {
  const host = useHost();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggle = (card: ListedCard) => {
    const next = openId === card.id ? null : card.id;
    setOpenId(next);
    setEditingId(null);
    host.select(next ? card : null);
  };

  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-edge">
      {cards.map((card) => (
        <CardRow
          key={card.id}
          card={card}
          showDeck={showDeck}
          open={openId === card.id}
          editing={editingId === card.id}
          onToggle={() => toggle(card)}
          onEdit={() => setEditingId(card.id)}
          onDone={(saved) => {
            setEditingId(null);
            if (saved) {
              onSaved?.(saved);
              host.select({ ...saved, deckName: card.deckName });
            }
          }}
        />
      ))}
    </ul>
  );
}

function CardRow({
  card,
  showDeck,
  open,
  editing,
  onToggle,
  onEdit,
  onDone,
}: {
  card: ListedCard;
  showDeck: boolean;
  open: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDone: (saved: ViewCard | null) => void;
}) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const panelId = `card-${card.id}`;
  return (
    <li className="py-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-start transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-text" lang={card.language ?? undefined}>
              {card.term}
            </span>
            {card.meaningSource === "ai" && <SourceChip source="ai" field="meaning" size="xs" />}
            {card.enrichmentStatus === "working" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Loader2
                  className="size-3 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <Trans>Enriching</Trans>
              </span>
            )}
          </span>
          <span className={clsx("text-sm", card.meaning ? "text-text-2" : "text-muted")}>
            {card.meaning ?? t`No meaning yet`}
          </span>
          {showDeck && card.deckName && <span className="text-xs text-muted">{card.deckName}</span>}
        </span>
        <ChevronDown
          className={clsx(
            "mt-1 size-4 shrink-0 text-faint transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id={panelId} className="px-2 pt-2 pb-3">
          {editing ? (
            <CardEditor
              card={card}
              onSaved={(saved) => onDone(saved)}
              onCancel={() => onDone(null)}
            />
          ) : (
            <CardDetails card={card}>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={onEdit}>
                  <Trans>Edit</Trans>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => host.open(links.card(card.deckId, card.id))}
                >
                  <Trans>Open in Lymi</Trans>
                  <ExternalLink data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
            </CardDetails>
          )}
        </div>
      )}
    </li>
  );
}

/** The fields beyond the term and meaning, each under its name, with the AI badge where Lymi wrote it. */
export function CardDetails({ card, children }: { card: ViewCard; children?: ReactNode }) {
  const { t } = useLingui();
  const rows: {
    label: string;
    text: string | null;
    ai: boolean;
    field: "example" | "pronunciation" | "hook" | null;
    lang?: boolean;
  }[] = [
    {
      label: t`Example`,
      text: card.example,
      ai: card.exampleSource === "ai",
      field: "example",
      lang: true,
    },
    {
      label: t`Pronunciation`,
      text: card.pronunciation,
      ai: card.pronunciationSource === "ai",
      field: "pronunciation",
    },
    { label: t`Hook`, text: card.hook, ai: card.hookSource === "ai", field: "hook" },
    { label: t`Picture`, text: card.image?.description ?? null, ai: false, field: null },
    { label: t`Source`, text: card.source, ai: false, field: null },
  ];
  const shown = rows.filter((row) => row.text);
  return (
    <div className="flex flex-col gap-3">
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {shown.map((row) => (
            <div key={row.label} className="contents">
              <dt className="flex items-center gap-1.5 text-muted">
                {row.label}
                {row.ai && row.field && <SourceChip source="ai" field={row.field} size="xs" />}
              </dt>
              <dd
                className="min-w-0 text-text"
                lang={row.lang ? (card.language ?? undefined) : undefined}
              >
                {row.text}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </div>
  );
}
