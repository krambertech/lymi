import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { SeriesInput } from "@lymi/core";
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, Check, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { DeckSummary, Series } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { Button, IconButton } from "./button";
import { RadioCard } from "./radio-card";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Input } from "./ui/input";
import { RadioGroup } from "./ui/radio-group";

export interface SeriesFormValue {
  name: string;
  deckIds: string[];
}

interface SeriesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The series being edited. Absent, the sheet makes a new one. */
  series?: Series | undefined;
  /** Every deck in Library. Only the learner's own can go in a series. */
  decks: DeckSummary[];
  /** Every active series, to say where a deck is now. */
  allSeries: Series[];
  onSubmit: (value: SeriesFormValue) => Promise<unknown>;
  pending?: boolean | undefined;
  error?: string | undefined;
}

/**
 * Making or changing a series is one form: its name, and which of the learner's decks it holds in
 * what order. The order is the one a series is reviewed and shown in, so it is set right here with
 * the arrows rather than only by dragging in Library.
 */
export function SeriesSheet({ open, onOpenChange, series, ...rest }: SeriesSheetProps) {
  const { t } = useLingui();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogTitle>{series ? t`Edit series` : t`New series`}</DialogTitle>
        <SeriesForm
          key={open ? (series?.id ?? "new") : "closed"}
          series={series}
          onCancel={() => onOpenChange(false)}
          {...rest}
        />
      </DialogContent>
    </Dialog>
  );
}

export function SeriesForm({
  series,
  decks,
  allSeries,
  onSubmit,
  onCancel,
  pending,
  error,
  static: st,
}: Omit<SeriesSheetProps, "open" | "onOpenChange"> & {
  onCancel: () => void;
  /** No autofocus. For the design page. */
  static?: boolean | undefined;
}) {
  const { t } = useLingui();
  const [name, setName] = useState(series?.name ?? "");
  const [chosen, setChosen] = useState<string[]>(series?.deckIds ?? []);
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const own = decks.filter((deck) => deck.role === "owner");
  const byId = new Map(own.map((deck) => [deck.id, deck]));
  const seriesName = new Map(allSeries.map((s) => [s.id, s.name]));
  const rows = [
    ...chosen.flatMap((id) => byId.get(id) ?? []),
    ...own.filter((deck) => !chosen.includes(deck.id)),
  ];

  const move = (index: number, by: -1 | 1) =>
    setChosen((ids) => {
      const next = [...ids];
      const [id] = next.splice(index, 1);
      if (id) next.splice(index + by, 0, id);
      return next;
    });

  return (
    <form
      ref={formRef}
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const parsed = SeriesInput.safeParse({ name, deckIds: chosen });
        if (!parsed.success) {
          setInvalid(
            fieldErrors(parsed.error, {
              name: name.trim()
                ? t`Keep the name under 80 characters.`
                : t`Give the series a name.`,
            }),
          );
          focusFirstInvalid(formRef.current);
          return;
        }
        setInvalid({});
        void onSubmit({ name: parsed.data.name, deckIds: chosen });
      }}
    >
      <Field>
        <FieldLabel>{t`Name`}</FieldLabel>
        <Input
          autoFocus={!st && !series}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(({ name: _, ...others }) => others);
          }}
          placeholder={t`Learn Estonian`}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={80}
        />
        <FieldError>{invalid.name}</FieldError>
      </Field>

      <FieldSet className="grid gap-2">
        <FieldLegend>{t`Decks`}</FieldLegend>
        <p className="text-sm text-text-2">
          {own.length === 0 ? (
            <Trans>Decks you make can go in a series. Decks you joined stay on their own.</Trans>
          ) : (
            <Trans>A series is reviewed together, and its decks show in this order.</Trans>
          )}
        </p>
        {own.length > 0 && (
          <ul className="grid gap-px">
            {rows.map((deck) => {
              const index = chosen.indexOf(deck.id);
              const checked = index >= 0;
              const elsewhere =
                deck.seriesId && deck.seriesId !== series?.id
                  ? seriesName.get(deck.seriesId)
                  : null;
              return (
                <li
                  key={deck.id}
                  className="flex min-h-12 items-center gap-2 rounded-md ps-2.5 pe-1 transition-[background-color] duration-150 hoverable:hover:bg-hover"
                >
                  <Field orientation="horizontal" className="min-w-0 flex-1 py-1.5">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(on) =>
                        setChosen((ids) =>
                          on ? [...ids, deck.id] : ids.filter((id) => id !== deck.id),
                        )
                      }
                    />
                    <span className="grid min-w-0 flex-1">
                      <FieldLabel className="truncate text-base font-normal">
                        {deck.name}
                      </FieldLabel>
                      <span className="truncate text-sm text-muted">
                        {elsewhere && !checked ? (
                          <Trans>Now in {elsewhere}</Trans>
                        ) : (
                          <Plural value={deck.total} one="# card" other="# cards" />
                        )}
                      </span>
                    </span>
                  </Field>
                  {checked && chosen.length > 1 && (
                    <span className="flex shrink-0">
                      <IconButton
                        size="sm"
                        label={t`Move ${deck.name} up`}
                        aria-disabled={index === 0}
                        className="aria-disabled:opacity-40"
                        onClick={() => index > 0 && move(index, -1)}
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        size="sm"
                        label={t`Move ${deck.name} down`}
                        aria-disabled={index === chosen.length - 1}
                        className="aria-disabled:opacity-40"
                        onClick={() => index < chosen.length - 1 && move(index, 1)}
                      >
                        <ArrowDown />
                      </IconButton>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </FieldSet>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="min-w-0 flex-1 text-sm text-danger" role="status">
          {error}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          {series ? <Trans>Save series</Trans> : <Trans>Create series</Trans>}
        </Button>
      </div>
    </form>
  );
}

interface DeleteSeriesDialogProps {
  series: Series | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (decks: "archive" | "keep") => void;
}

/**
 * Deleting a series is the one write the app cannot undo, so it always asks, and when the series
 * holds decks the learner also says whether they go too. The decks and their cards survive either
 * way; only the grouping is lost.
 */
export function DeleteSeriesDialog({ series, onOpenChange, onDelete }: DeleteSeriesDialogProps) {
  const { t } = useLingui();
  const [choice, setChoice] = useState<"archive" | "keep">("keep");
  const name = useId();
  const seriesName = series?.name ?? "";
  const count = series?.deckIds.length ?? 0;
  // Keyed on the series, not on closing: Cancel and Delete close it from the parent, which never
  // reaches `onOpenChange`, and a remembered Archive would take the next series' decks unasked.
  useEffect(() => {
    if (series) setChoice("keep");
  }, [series]);
  return (
    <Dialog open={!!series} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,460px)]">
        <DialogHeader>
          <DialogTitle>{t`Delete “${seriesName}”?`}</DialogTitle>
          <DialogDescription>
            {count > 0 ? (
              <Trans>
                The series is gone for good. Its decks and cards stay, and you can group them again
                in a new series.
              </Trans>
            ) : (
              <Trans>The series is gone for good. You can make a new one any time.</Trans>
            )}
          </DialogDescription>
        </DialogHeader>
        {count > 0 && (
          <RadioGroup<"archive" | "keep">
            aria-label={t`What happens to its decks`}
            name={name}
            value={choice}
            onValueChange={setChoice}
          >
            <RadioCard
              value="keep"
              title={<Plural value={count} one="Keep the deck" other="Keep the decks" />}
              description={
                <Plural
                  value={count}
                  one="It stays in Library without a series, and keeps coming up in review."
                  other="They stay in Library without a series, and keep coming up in review."
                />
              }
            />
            <RadioCard
              value="archive"
              title={
                <Plural value={count} one="Archive its deck too" other="Archive its # decks too" />
              }
              description={
                <Plural
                  value={count}
                  one="It leaves Library and stops coming up in review. Restore it from Archived."
                  other="They leave Library and stop coming up in review. Restore them from Archived."
                />
              }
            />
          </RadioGroup>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button variant="danger" onClick={() => onDelete(count > 0 ? choice : "keep")}>
            <Trans>Delete series</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MoveToSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckName: string;
  current: string | null;
  series: Series[] | undefined;
  onMove: (seriesId: string | null) => void;
  onCreate: (name: string) => Promise<unknown>;
  creating?: boolean | undefined;
  error?: string | undefined;
}

/** A deck picks its series from where the deck is, so moving one never needs a trip to Library. */
export function MoveToSeriesDialog({
  open,
  onOpenChange,
  deckName,
  current,
  series,
  onMove,
  onCreate,
  creating,
  error,
}: MoveToSeriesDialogProps) {
  const { t } = useLingui();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | undefined>();
  const row =
    "flex min-h-12 w-full items-center gap-3 px-4 text-start text-base transition-[background-color] duration-150 hoverable:hover:bg-hover aria-[current=true]:font-medium";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setNaming(false);
          setName("");
          setInvalid(undefined);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[min(92vw,420px)]">
        <DialogHeader>
          <DialogTitle>{t`Move to series`}</DialogTitle>
          <DialogDescription>
            <Trans>
              “{deckName}” is reviewed with the other decks in its series and shows with them in
              Library.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <ul className="edge overflow-hidden rounded-lg bg-plate">
          {(series ?? []).map((s) => (
            <li key={s.id} className="border-edge not-first:border-t">
              <button
                type="button"
                className={row}
                aria-current={s.id === current}
                onClick={() => (s.id === current ? onOpenChange(false) : onMove(s.id))}
              >
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                {s.id === current && <Check className="size-[18px]" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {current && (
            <li className="border-edge not-first:border-t">
              <button
                type="button"
                className={clsx(row, "text-text-2")}
                onClick={() => onMove(null)}
              >
                <span className="min-w-0 flex-1">
                  <Trans>No series</Trans>
                </span>
              </button>
            </li>
          )}
          <li className="border-edge not-first:border-t">
            {naming ? (
              <form
                className="grid gap-2 p-3"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (creating) return;
                  const parsed = SeriesInput.shape.name.safeParse(name);
                  if (!parsed.success) {
                    setInvalid(
                      name.trim()
                        ? t`Keep the name under 80 characters.`
                        : t`Give the series a name.`,
                    );
                    return;
                  }
                  void onCreate(parsed.data);
                }}
              >
                <Field>
                  <FieldLabel>{t`New series`}</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setInvalid(undefined);
                      }}
                      placeholder={t`Learn Estonian`}
                      autoComplete="off"
                      enterKeyHint="done"
                      maxLength={80}
                      className="min-w-0 flex-1"
                    />
                    <Button variant="primary" type="submit" loading={creating}>
                      <Trans>Create and move</Trans>
                    </Button>
                  </div>
                  <FieldError>{invalid}</FieldError>
                </Field>
              </form>
            ) : (
              <button
                type="button"
                className={clsx(row, "text-text-2")}
                onClick={() => setNaming(true)}
              >
                <Plus className="size-[18px]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <Trans>New series</Trans>
                </span>
              </button>
            )}
          </li>
        </ul>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
