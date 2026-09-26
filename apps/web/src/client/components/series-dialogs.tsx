import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { SeriesInput, seriesLimits } from "@lymi/core";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { DeckSummary, Series } from "../lib/api";
import { useDesktop } from "../lib/device";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { pageTitle } from "../lib/page-focus";
import { Button, IconButton } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import { InlineError } from "./inline-error";
import { MoveToDialog, useNameCheck } from "./move-to-dialog";
import { useStaticNav } from "./nav-link";
import { RadioCard } from "./radio-card";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
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
      <DialogContent size="md">
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
}: Omit<SeriesSheetProps, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const { t } = useLingui();
  const desktop = useDesktop();
  const st = !!useStaticNav();
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
          // On touch the drawer settles first and the keyboard waits for a tap on the field.
          autoFocus={!st && !series && desktop}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(({ name: _, ...others }) => others);
          }}
          placeholder={t`Learn Estonian`}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={seriesLimits.name ?? undefined}
        />
        <FieldError>{invalid.name}</FieldError>
      </Field>

      <FieldSet className="grid gap-2">
        <FieldLegend>{t`Decks`}</FieldLegend>
        <p className="text-sm text-text-2">
          {own.length === 0 ? (
            <Trans>No decks of your own yet. Only decks you create can go in a series.</Trans>
          ) : (
            <Trans>Review these decks together, in this order.</Trans>
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
                    <span className="flex shrink-0 [--hit-x:0px]">
                      <IconButton
                        size="sm"
                        label={t`Move ${deck.name} up`}
                        aria-disabled={index === 0}
                        onClick={() => index > 0 && move(index, -1)}
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        size="sm"
                        label={t`Move ${deck.name} down`}
                        aria-disabled={index === chosen.length - 1}
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
        <p className="min-w-0 flex-1 text-sm" role="status">
          {error && <InlineError>{error}</InlineError>}
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

type SeriesDecks = "archive" | "keep";

interface DeleteSeriesDialogProps {
  series: Series | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (decks: SeriesDecks) => void;
}

/**
 * Deleting a series is the one write the app cannot undo, so it always asks, and when the series
 * holds decks the learner also says whether they go too. The decks and their cards survive either
 * way; only the grouping is lost.
 */
export function DeleteSeriesDialog({ series, onOpenChange, onDelete }: DeleteSeriesDialogProps) {
  const { t } = useLingui();
  const name = useId();
  const deleted = useRef(false);
  return (
    <ConfirmDialog<Series, SeriesDecks>
      subject={series}
      onOpenChange={onOpenChange}
      size="md"
      // The options button that opened it leaves with the series.
      finalFocus={() => {
        const gone = deleted.current;
        deleted.current = false;
        return (gone && pageTitle()) || true;
      }}
      title={({ name: seriesName }) => t`Delete “${seriesName}”?`}
      description={({ deckIds }) =>
        deckIds.length > 0 ? (
          <Trans>You can’t undo this. Its decks and cards aren’t deleted either way.</Trans>
        ) : (
          <Trans>You can’t undo this.</Trans>
        )
      }
      dismiss={<Trans>Cancel</Trans>}
      confirm={<Trans>Delete series</Trans>}
      defaultValue="keep"
      onConfirm={(decks) => {
        deleted.current = true;
        onDelete(decks);
      }}
    >
      {({ deckIds }, choice, setChoice) => {
        const count = deckIds.length;
        return (
          count > 0 && (
            <RadioGroup<SeriesDecks>
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
                  <Plural
                    value={count}
                    one="Archive its deck too"
                    other="Archive its # decks too"
                  />
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
          )
        );
      }}
    </ConfirmDialog>
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
  pending?: boolean | undefined;
  error?: string | undefined;
}

/** A deck picks its series from where the deck is, so moving one never needs a trip to Library. */
export function MoveToSeriesDialog({ deckName, series, onMove, ...rest }: MoveToSeriesDialogProps) {
  const { t } = useLingui();
  const check = useNameCheck(SeriesInput.shape.name, t`Give the series a name.`);
  return (
    <MoveToDialog
      title={t`Move to series`}
      description={<Trans>“{deckName}” is reviewed with the other decks in its series.</Trans>}
      items={series ?? []}
      noneLabel={<Trans>No series</Trans>}
      newLabel={t`New series`}
      placeholder={t`Learn Estonian`}
      maxLength={seriesLimits.name ?? undefined}
      validate={check}
      onMove={(item) => onMove(item?.id ?? null)}
      {...rest}
    />
  );
}
