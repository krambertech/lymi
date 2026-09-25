import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { SectionInput, sectionLimits } from "@lymi/core";
import { useId, useState } from "react";
import type { Section } from "../lib/api";
import { useDesktop } from "../lib/device";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import { InlineError } from "./inline-error";
import { MoveToDialog, useNameCheck } from "./move-to-dialog";
import { RadioCard } from "./radio-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { RadioGroup } from "./ui/radio-group";

function useNameError() {
  const { t } = useLingui();
  return useNameCheck(SectionInput.shape.name, t`Give the section a name.`);
}

interface SectionNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The section being renamed. Absent, the dialog makes a new one. */
  section?: Section | undefined;
  onSubmit: (name: string) => Promise<unknown>;
  pending?: boolean | undefined;
  error?: string | undefined;
}

/** A section is a name, so making or renaming one is one field. */
export function SectionNameDialog({
  open,
  onOpenChange,
  section,
  onSubmit,
  pending,
  error,
}: SectionNameDialogProps) {
  const { t } = useLingui();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section ? t`Rename section` : t`New section`}</DialogTitle>
          {!section && (
            <DialogDescription>
              <Trans>It goes at the end. Move cards into it from the list.</Trans>
            </DialogDescription>
          )}
        </DialogHeader>
        <NameForm
          key={open ? (section?.id ?? "new") : "closed"}
          initial={section?.name ?? ""}
          submitLabel={section ? t`Save` : t`Create section`}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
          pending={pending}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}

function NameForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
  pending,
  error,
}: {
  initial: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<unknown>;
  pending?: boolean | undefined;
  error?: string | undefined;
}) {
  const { t } = useLingui();
  const desktop = useDesktop();
  const check = useNameError();
  const [name, setName] = useState(initial);
  const [invalid, setInvalid] = useState<string | undefined>();
  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const result = check(name);
        setInvalid(result.error);
        if (!result.error) void onSubmit(result.name);
      }}
    >
      <Field>
        <FieldLabel>{t`Name`}</FieldLabel>
        <Input
          // On touch the drawer settles first and the keyboard waits for a tap on the field.
          autoFocus={desktop}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(undefined);
          }}
          placeholder={t`Lesson 15`}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={sectionLimits.name ?? undefined}
        />
        <FieldError>{invalid}</FieldError>
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="min-w-0 flex-1 text-sm" role="status">
          {error && <InlineError>{error}</InlineError>}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

type SectionCards = "archive" | "keep";

interface ArchiveSectionDialogProps {
  section: Section | null;
  onOpenChange: (open: boolean) => void;
  onArchive: (cards: SectionCards) => void;
}

/** Archiving a section with cards asks first, because the owner says what happens to the cards. */
export function ArchiveSectionDialog({
  section,
  onOpenChange,
  onArchive,
}: ArchiveSectionDialogProps) {
  const { t } = useLingui();
  const name = useId();
  return (
    <ConfirmDialog<Section, SectionCards>
      subject={section}
      onOpenChange={onOpenChange}
      size="md"
      title={({ name: sectionName }) => t`Archive “${sectionName}”?`}
      description={
        <Trans>Nothing is deleted. Restore it from Archived sections in the deck’s menu.</Trans>
      }
      dismiss={<Trans>Cancel</Trans>}
      confirm={<Trans>Archive section</Trans>}
      defaultValue="keep"
      onConfirm={onArchive}
    >
      {({ total: count }, choice, setChoice) => (
        <RadioGroup<SectionCards>
          aria-label={t`What happens to its cards`}
          name={name}
          value={choice}
          onValueChange={setChoice}
        >
          <RadioCard
            value="keep"
            title={<Plural value={count} one="Keep the card" other="Keep the cards" />}
            description={
              <Plural
                value={count}
                one="It stays in the deck without a section, and keeps coming up in review."
                other="They stay in the deck without a section, and keep coming up in review."
              />
            }
          />
          <RadioCard
            value="archive"
            title={
              <Plural value={count} one="Archive its card too" other="Archive its # cards too" />
            }
            description={
              <Plural
                value={count}
                one="It leaves the deck and stops coming up in review until you restore the section."
                other="They leave the deck and stop coming up in review until you restore the section."
              />
            }
          />
        </RadioGroup>
      )}
    </ConfirmDialog>
  );
}

interface ArchivedSectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Undefined while loading. */
  sections: Section[] | undefined;
  onRestore: (section: Section) => void;
  restoring?: string | undefined;
  error?: string | undefined;
}

export function ArchivedSectionsDialog({
  open,
  onOpenChange,
  sections,
  onRestore,
  restoring,
  error,
}: ArchivedSectionsDialogProps) {
  const { t } = useLingui();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t`Archived sections`}</DialogTitle>
          <DialogDescription>
            <Trans>
              Restore brings a section back in its place, with the cards archived alongside it.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm" role="alert">
            <InlineError>{error}</InlineError>
          </p>
        ) : sections === undefined ? (
          <div className="grid gap-2" aria-hidden="true">
            <div className="h-14 animate-pulse rounded-md bg-plate-2" />
            <div className="h-14 animate-pulse rounded-md bg-plate-2" />
          </div>
        ) : sections.length === 0 ? (
          <p className="text-base text-text-2">
            <Trans>No archived sections.</Trans>
          </p>
        ) : (
          <ul className="grid gap-px">
            {sections.map((s) => (
              <li key={s.id} className="flex min-h-14 items-center gap-3 rounded-md px-2.5">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-base font-medium">{s.name}</span>
                  <span className="text-sm text-muted">
                    {s.archivedCards > 0 ? (
                      <Plural
                        value={s.archivedCards}
                        one="# card comes back with it"
                        other="# cards come back with it"
                      />
                    ) : (
                      <Trans>The cards you kept move back into it</Trans>
                    )}
                  </span>
                </span>
                <Button
                  size="sm"
                  loading={restoring === s.id}
                  aria-disabled={!!restoring}
                  onClick={() => !restoring && onRestore(s)}
                >
                  <Trans>Restore</Trans>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            <Trans>Close</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MoveToSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The one card's term, or the number of cards moving. */
  term?: string | undefined;
  count: number;
  /** The section every moving card is in, when they share one. */
  current: string | null | undefined;
  sections: Section[];
  onMove: (section: Section | null) => void;
  onCreate: (name: string) => Promise<unknown>;
  pending?: boolean | undefined;
  error?: string | undefined;
}

/** Cards pick their section from where they are, one or many at once. */
export function MoveToSectionDialog({ term, count, sections, ...rest }: MoveToSectionDialogProps) {
  const { t } = useLingui();
  const check = useNameError();
  return (
    <MoveToDialog
      title={
        term && count === 1 ? (
          t`Move “${term}” to`
        ) : (
          <Plural value={count} one="Move # card to" other="Move # cards to" />
        )
      }
      description={<Trans>Moving a card keeps its progress.</Trans>}
      items={sections}
      noneLabel={<Trans>No section</Trans>}
      newLabel={t`New section`}
      placeholder={t`Lesson 15`}
      maxLength={sectionLimits.name ?? undefined}
      validate={check}
      {...rest}
    />
  );
}

interface StartEarlyDialogProps {
  /** The section to start, with the locked sections before it that start with it. */
  target: { section: Section; opening: Section[] } | null;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
}

/**
 * Starting a section early that has locked sections before it opens them too, so the learner is
 * told how many and how many cards before it happens. Starting is never undone.
 */
export function StartEarlyDialog({ target, onOpenChange, onStart }: StartEarlyDialogProps) {
  const { t } = useLingui();
  return (
    <ConfirmDialog
      subject={target}
      onOpenChange={onOpenChange}
      title={({ section: { name: sectionName } }) => t`Start ${sectionName} early?`}
      description={({ opening }) => {
        const others = opening.length - 1;
        const cards = opening.reduce((sum, s) => sum + s.total, 0);
        return (
          <>
            <Plural
              value={others}
              one="The section before it starts too, so sections stay in order."
              other="The # sections before it start too, so sections stay in order."
            />{" "}
            <Plural
              value={cards}
              one="# card is added to your reviews."
              other="# cards are added to your reviews."
            />
          </>
        );
      }}
      dismiss={<Trans>Cancel</Trans>}
      confirm={({ opening }) => {
        const others = opening.length - 1;
        return <Plural value={others + 1} one="Start section" other="Start # sections" />;
      }}
      tone="primary"
      onConfirm={onStart}
    >
      {({ opening }) => (
        <ul className="grid gap-1 text-base text-text-2">
          {opening.map((s) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="text-sm text-muted tabular-nums">
                <Plural value={s.total} one="# card" other="# cards" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </ConfirmDialog>
  );
}
