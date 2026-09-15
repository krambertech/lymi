import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { FieldRole, ImportFailure } from "@lymi/core";
import { clsx } from "clsx";
import { Check, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import type { Import, ImportPreview } from "../lib/api";
import { Button, IconButton } from "./button";
import { Chip } from "./chip";
import { LanguageField, languageName } from "./deck-fields";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Field, FieldLabel } from "./ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export type Summary = NonNullable<Import["summary"]>;
export type NoteType = Summary["noteTypes"][number];
export type Sample = ImportPreview["samples"][string][number];
export type Choices = {
  languages: Record<string, string | null>;
  roles: Record<string, FieldRole[]>;
};

export const ROLE_LABELS: Record<FieldRole, MessageDescriptor> = {
  term: msg`Term`,
  meaning: msg`Meaning`,
  pronunciation: msg`Pronunciation`,
  example: msg`Example`,
  notes: msg`Notes`,
  skip: msg`Leave out`,
};

/** What went wrong, and what the learner can do about it. */
export function failureCopy(failure: ImportFailure | null) {
  switch (failure) {
    case "unrecognized":
      return {
        title: msg`Lymi couldn’t read this file`,
        body: msg`Export it again from Anki as an Anki Deck Package (.apkg), then choose that file.`,
      };
    case "damaged":
      return {
        title: msg`This file is damaged`,
        body: msg`Export it again from Anki, then choose the new file.`,
      };
    case "too_large":
      return {
        title: msg`This collection is too large to import at once`,
        body: msg`Export one deck at a time, or export again without media.`,
      };
    case "upload_incomplete":
      return {
        title: msg`The upload didn’t finish`,
        body: msg`Try again on a steadier connection, and keep Lymi open until the upload is done.`,
      };
    case "expired":
      return {
        title: msg`This import was closed`,
        body: msg`It waited three days without being confirmed, so its file was deleted. Start it again.`,
      };
    default:
      return {
        title: msg`The import stopped`,
        body: msg`Something went wrong on Lymi’s side. Cards added before it stopped are in your decks.`,
      };
  }
}

/** A size a learner reads: 59 KB, 230 MB. */
export function fileSize(bytes: number, locale: string) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
}

/**
 * One imported card as it will arrive: the term large, the rule, then everything under it, in
 * the order the card page shows a card. It is the learner's check that the fields are read right.
 */
export function SampleCard({ sample, loading }: { sample: Sample | undefined; loading?: boolean }) {
  const { t } = useLingui();
  if (!sample) {
    return (
      <div className="grid min-h-40 place-items-center rounded-lg bg-plate-2 p-5 text-center text-base text-muted">
        {loading ? (
          <Trans>Getting a card ready…</Trans>
        ) : (
          <Trans>No card of this kind has a term.</Trans>
        )}
      </div>
    );
  }
  const rows: [string, string | null][] = [
    [t`Pronunciation`, sample.pronunciation],
    [t`Example`, sample.example],
    [t`Notes`, sample.notes],
  ];
  return (
    <div className={clsx("grid gap-3 transition-opacity duration-150", loading && "opacity-60")}>
      <p className="text-[2rem] font-medium leading-[1.05] tracking-[-0.03em] text-text [overflow-wrap:anywhere]">
        {sample.term}
      </p>
      <div className="h-px bg-edge" />
      <div className="flex items-start gap-3">
        <p
          className={clsx(
            "min-w-0 flex-1 text-xl leading-snug [overflow-wrap:anywhere]",
            sample.meaning ? "text-text" : "text-muted",
          )}
        >
          {sample.meaning ?? <Trans>No meaning</Trans>}
        </p>
        {sample.picture && (
          <span className="grid size-14 shrink-0 place-items-center rounded-md bg-plate-2 text-muted">
            <ImageIcon className="size-5" aria-hidden="true" />
            <span className="sr-only">
              <Trans>Has a picture</Trans>
            </span>
          </span>
        )}
      </div>
      {rows.some(([, value]) => value) && (
        <dl className="grid gap-1.5 text-base">
          {rows.map(([label, value]) =>
            value ? (
              <div key={label} className="grid gap-0.5">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="line-clamp-3 whitespace-pre-line text-text-2 [overflow-wrap:anywhere]">
                  {value}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      )}
      {sample.modes.length > 1 && (
        <p className="text-sm text-muted">
          <Trans>Asked both ways: from the term, and from the meaning.</Trans>
        </p>
      )}
      {sample.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sample.tags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The note types, one at a time, each asking whether its card looks right. A note type counts
 * as checked once the learner says so or changes its fields.
 */
export function CardCheck({
  noteTypes,
  samples,
  loading,
  checked,
  onChecked,
  onChangeFields,
  error,
}: {
  noteTypes: NoteType[];
  samples: ImportPreview["samples"] | undefined;
  loading: boolean;
  checked: Set<string>;
  onChecked: (key: string) => void;
  onChangeFields: (type: NoteType) => void;
  error?: string | undefined;
}) {
  const { t } = useLingui();
  const [index, setIndex] = useState(0);
  const [sampleIndex, setSampleIndex] = useState(0);
  const type = noteTypes[Math.min(index, noteTypes.length - 1)];
  if (!type) return null;
  const list = samples?.[type.key] ?? [];
  const sample = list[Math.min(sampleIndex, list.length - 1)];
  const isChecked = checked.has(type.key);
  const go = (next: number) => {
    setIndex(next);
    setSampleIndex(0);
  };

  return (
    <section aria-labelledby="card-check" className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="card-check" className="text-md font-medium text-text">
          <Trans>Does this card look right?</Trans>
        </h2>
        {noteTypes.length > 1 && (
          <p className="text-sm text-muted tabular-nums">
            {t`${checked.size} of ${noteTypes.length} checked`}
          </p>
        )}
      </div>
      <div className="edge grid gap-4 rounded-xl bg-plate p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip>
            {type.name} · {plural(type.notes, { one: "# note", other: "# notes" })}
          </Chip>
          {list.length > 1 && (
            <button
              type="button"
              className="text-sm text-muted underline-offset-4 hoverable:hover:text-text hoverable:hover:underline"
              onClick={() => setSampleIndex((sampleIndex + 1) % list.length)}
            >
              <Trans>Show another</Trans>
            </button>
          )}
        </div>
        <SampleCard sample={sample} loading={loading} />
        <div className="flex flex-wrap items-center gap-2 border-t border-edge pt-4">
          <Button
            variant="secondary"
            aria-pressed={isChecked}
            onClick={() => {
              onChecked(type.key);
              const next = noteTypes.findIndex((n, i) => i > index && !checked.has(n.key));
              if (next >= 0) go(next);
            }}
            className={clsx(isChecked && "text-good")}
          >
            <Check aria-hidden="true" />
            {isChecked ? <Trans>Looks right</Trans> : <Trans>Yes, looks right</Trans>}
          </Button>
          <Button variant="ghost" onClick={() => onChangeFields(type)}>
            <Trans>Change fields</Trans>
          </Button>
          {noteTypes.length > 1 && (
            <div className="ms-auto flex items-center gap-1">
              <IconButton
                label={t`Previous kind of card`}
                size="sm"
                onClick={() => go((index - 1 + noteTypes.length) % noteTypes.length)}
              >
                <ChevronLeft className="rtl:-scale-x-100" />
              </IconButton>
              <span className="min-w-12 text-center text-sm text-muted tabular-nums">
                {index + 1} / {noteTypes.length}
              </span>
              <IconButton
                label={t`Next kind of card`}
                size="sm"
                onClick={() => go((index + 1) % noteTypes.length)}
              >
                <ChevronRight className="rtl:-scale-x-100" />
              </IconButton>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** What each field of one note type becomes, with the first note's text beside it. */
export function FieldsDialog({
  type,
  roles,
  open,
  onOpenChange,
  onSave,
}: {
  type: NoteType | undefined;
  roles: FieldRole[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (roles: FieldRole[]) => void;
}) {
  const { t, i18n } = useLingui();
  const [draft, setDraft] = useState<FieldRole[]>(roles ?? []);
  const [error, setError] = useState<string>();
  const options = (Object.keys(ROLE_LABELS) as FieldRole[]).map((role) => ({
    value: role,
    label: i18n._(ROLE_LABELS[role]),
  }));
  if (!type) return null;
  const example = type.samples[0] ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,520px)]">
        <DialogTitle>{t`Fields of ${type.name}`}</DialogTitle>
        <DialogDescription>
          <Trans>Choose what each Anki field becomes on a Lymi card. One field is the term.</Trans>
        </DialogDescription>
        <form
          key={open ? "open" : "closed"}
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.filter((role) => role === "term").length !== 1) {
              setError(t`Choose exactly one field as the term.`);
              return;
            }
            onSave(draft);
            onOpenChange(false);
          }}
        >
          <ul className="grid gap-3">
            {type.fields.map((field, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: a note type can repeat a field name, and its fields never reorder
                key={`${field}-${i}`}
                className="grid grid-cols-[1fr_minmax(9rem,auto)] items-end gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{field}</p>
                  <p className="truncate text-sm text-muted">
                    {example[i] || t`Empty in the first note`}
                  </p>
                </div>
                <Field>
                  <FieldLabel className="sr-only">{t`${field} becomes`}</FieldLabel>
                  <Select
                    items={options}
                    value={draft[i] ?? "skip"}
                    onValueChange={(value) => {
                      setError(undefined);
                      setDraft((current) =>
                        current.map((role, j) => (j === i ? (value as FieldRole) : role)),
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent aria-label={t`${field} becomes`}>
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <p className="flex-1 text-sm text-danger" role="status">
              {error}
            </p>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="primary" type="submit">
              <Trans>Use these fields</Trans>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Each deck's language, guessed from its name and changeable here. */
export function LanguagesDialog({
  decks,
  languages,
  open,
  onOpenChange,
  onSave,
}: {
  decks: Summary["decks"];
  languages: Record<string, string | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (languages: Record<string, string | null>) => void;
}) {
  const { t } = useLingui();
  const [draft, setDraft] = useState(languages);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,480px)]">
        <DialogTitle>{t`Languages`}</DialogTitle>
        <DialogDescription>
          <Trans>
            Anki doesn’t store a language, so Lymi guessed from each deck’s name. Lymi uses it to
            find words you already have and to say words out loud.
          </Trans>
        </DialogDescription>
        <form
          key={open ? "open" : "closed"}
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft);
            onOpenChange(false);
          }}
        >
          <div className="grid max-h-[55dvh] gap-4 overflow-y-auto pe-1">
            {decks.map((deck) => (
              <LanguageField
                key={deck.key}
                label={deck.name.split("::").join(" / ")}
                description={t`${plural(deck.cards, { one: "# card", other: "# cards" })}`}
                value={draft[deck.key] ?? null}
                onChange={(value) => setDraft((current) => ({ ...current, [deck.key]: value }))}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="primary" type="submit">
              <Trans>Use these languages</Trans>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Italian, Japanese" for the row that opens the languages dialog. */
export function languagesLine(
  decks: Summary["decks"],
  languages: Record<string, string | null>,
  locale: string,
  none: string,
) {
  const names = [...new Set(decks.map((d) => languages[d.key] ?? null))].map((tag) =>
    tag ? languageName(tag, locale) : none,
  );
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
}
