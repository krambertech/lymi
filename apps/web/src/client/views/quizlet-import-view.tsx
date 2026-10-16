import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  detectSeparators,
  MAX_SEPARATOR_LENGTH,
  MAX_TEXT_IMPORT_BYTES,
  MAX_TEXT_IMPORT_CARDS,
  parseDelimited,
  type TextSeparators,
} from "@lymi/core";
import { FileText } from "lucide-react";
import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { Button } from "../components/button";
import { InlineError } from "../components/inline-error";
import type { Back } from "../components/layout/screen";
import { Field, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { ImportShell } from "./import-view";

/** What the learner sends on: the text, the separators it is read with, and where it goes. */
export type QuizletImportRequest = {
  text: string;
  separators: TextSeparators;
  deckName: string;
  deckId: string | null;
};

type FieldChoice = "tab" | "comma" | "custom";
type RowChoice = "newline" | "semicolon" | "custom";

const fieldChoice = (sep: string): FieldChoice =>
  sep === "\t" ? "tab" : sep === "," ? "comma" : "custom";
const rowChoice = (sep: string): RowChoice =>
  sep === "\n" ? "newline" : sep === ";" ? "semicolon" : "custom";
const PREVIEW_ROWS = 5;
const NEW_DECK = "new";

/**
 * A Quizlet set by paste, or by a .txt of the same text. The separators are detected and can
 * be changed; the first rows show as they will arrive, with what is skipped. The text is read
 * with the same parser the server imports with. docs/design/imports.md.
 */
export function QuizletImportView({
  decks,
  onContinue,
  pending,
  error,
  guideUrl,
  back,
}: {
  /** The learner's own decks, which the cards may join instead of a new deck. */
  decks: { id: string; name: string }[];
  onContinue: (request: QuizletImportRequest) => void;
  pending?: boolean | undefined;
  error?: string | undefined;
  guideUrl: string;
  back?: Back | undefined;
}) {
  const { t } = useLingui();
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<TextSeparators | null>(null);
  const [setName, setSetName] = useState("");
  const [deck, setDeck] = useState<string>(NEW_DECK);
  const [refused, setRefused] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const tooBig = new Blob([text]).size > MAX_TEXT_IMPORT_BYTES;

  const typed = useDeferredValue(text);
  const detected = useMemo(() => (typed.trim() ? detectSeparators(typed) : null), [typed]);
  const separators = chosen ?? detected ?? { field: "\t", row: "\n" };
  const parsed = useMemo(
    () => (typed.trim() ? parseDelimited(typed, separators) : null),
    [typed, separators],
  );
  const doubtful = !chosen && detected !== null && detected.confidence < 0.8;
  const cards = parsed?.cards.length ?? 0;
  const overCap = cards > MAX_TEXT_IMPORT_CARDS;
  const ready = cards > 0 && !overCap && !tooBig && separators.field !== "";

  const fieldItems = [
    { value: "tab", label: t`Tab` },
    { value: "comma", label: t`Comma` },
    { value: "custom", label: t`Custom` },
  ];
  const rowItems = [
    { value: "newline", label: t`New line` },
    { value: "semicolon", label: t`Semicolon` },
    { value: "custom", label: t`Custom` },
  ];
  const deckItems = [
    { value: NEW_DECK, label: t`A new deck` },
    ...decks.map((d) => ({ value: d.id, label: d.name })),
  ];

  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(txt|tsv|csv)$/i.test(file.name)) {
      setRefused(t`This isn’t a .txt file. Paste the text Quizlet copies, or choose a .txt file.`);
      return;
    }
    if (file.size > MAX_TEXT_IMPORT_BYTES) {
      setRefused(t`This file is larger than 5 MB. Split the set and import it in parts.`);
      return;
    }
    setRefused(null);
    setText(await file.text());
    setChosen(null);
    if (!setName) setSetName(file.name.replace(/\.[^.]+$/, ""));
  };

  const message = refused ?? error;

  return (
    <ImportShell title={t`Import from Quizlet`} back={back}>
      <p className="-mt-4 max-w-[60ch] text-md text-text-2 text-pretty">
        <Trans>
          Paste a set you made in Quizlet. Terms and definitions come across; pictures, audio and
          progress don’t, so every card starts as new.
        </Trans>
      </p>

      <section aria-labelledby="quizlet-steps" className="grid gap-3">
        <h2 id="quizlet-steps" className="text-md font-medium">
          <Trans>Copying from Quizlet</Trans>
        </h2>
        <ol className="grid gap-3 text-base text-text-2">
          {[
            <Trans key="open">
              On quizlet.com, open your set, open its{" "}
              <strong className="font-medium text-text">…</strong> menu and choose{" "}
              <strong className="font-medium text-text">Export</strong>.
            </Trans>,
            <Trans key="seps">
              Keep <strong className="font-medium text-text">Tab</strong> and{" "}
              <strong className="font-medium text-text">New line</strong>. If a card has line
              breaks, set a custom row separator such as ##.
            </Trans>,
            <Trans key="copy">
              Press <strong className="font-medium text-text">Copy text</strong>, then paste it
              here.
            </Trans>,
          ].map((node, i) => (
            <li key={node.key} className="grid grid-cols-[26px_1fr] gap-3">
              <span
                aria-hidden="true"
                className="edge grid size-[26px] place-items-center rounded-full bg-plate-2 text-xs font-semibold text-text tabular-nums"
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-pretty">{node}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3">
        <Field>
          <FieldLabel htmlFor={pasteId}>
            <Trans>Your set’s text</Trans>
          </FieldLabel>
          <Textarea
            id={pasteId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setRefused(null);
            }}
            rows={6}
            spellCheck={false}
            placeholder={t`der Hund	the dog`}
            className="min-h-36 font-mono text-sm"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept=".txt,.tsv,.csv,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => input.current?.click()}>
            <FileText className="size-4" aria-hidden="true" />
            <Trans>Or choose a .txt file</Trans>
          </Button>
        </div>
      </section>

      {parsed && (
        <>
          <section aria-labelledby="quizlet-separators" className="grid gap-3">
            <h2 id="quizlet-separators" className="text-md font-medium">
              <Trans>Separators</Trans>
            </h2>
            {doubtful && (
              <p className="text-sm" role="status">
                <InlineError>
                  <Trans>Check the separators. The preview below shows how they read.</Trans>
                </InlineError>
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <SeparatorField
                label={t`Between term and definition`}
                items={fieldItems}
                choice={fieldChoice(separators.field)}
                value={separators.field}
                presets={{ tab: "\t", comma: "," }}
                onChange={(field) => setChosen({ ...separators, field })}
              />
              <SeparatorField
                label={t`Between rows`}
                items={rowItems}
                choice={rowChoice(separators.row)}
                value={separators.row}
                presets={{ newline: "\n", semicolon: ";" }}
                onChange={(row) => setChosen({ ...separators, row })}
              />
            </div>
          </section>

          <section aria-labelledby="quizlet-preview" className="grid gap-3">
            <h2 id="quizlet-preview" className="text-md font-medium">
              {plural(cards, { one: "# card", other: "# cards" })}
            </h2>
            {cards > 0 && (
              <div className="edge overflow-hidden rounded-xl bg-plate">
                <table className="w-full table-fixed text-start text-base">
                  <thead className="text-sm text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        <Trans>Term</Trans>
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        <Trans>Definition</Trans>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.cards.slice(0, PREVIEW_ROWS).map((card, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id, and repeats are allowed.
                      <tr key={i} className="border-edge border-t align-top">
                        <td dir="auto" className="px-4 py-2 break-words whitespace-pre-wrap">
                          {card.term}
                        </td>
                        <td
                          dir="auto"
                          className="px-4 py-2 break-words whitespace-pre-wrap text-text-2"
                        >
                          {card.definition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ul className="grid gap-1 text-sm text-text-2">
              {cards > PREVIEW_ROWS && (
                <li>
                  {plural(cards - PREVIEW_ROWS, {
                    one: "and # more card",
                    other: "and # more cards",
                  })}
                </li>
              )}
              {parsed.oneSided > 0 && (
                <li data-testid="quizlet-skipped">
                  {plural(parsed.oneSided, {
                    one: "# row has only one side, so it’s skipped.",
                    other: "# rows have only one side, so they’re skipped.",
                  })}
                </li>
              )}
              {parsed.repeated > 0 && (
                <li>
                  {plural(parsed.repeated, {
                    one: "# term appears more than once. Every card is imported.",
                    other: "# terms appear more than once. Every card is imported.",
                  })}
                </li>
              )}
            </ul>
            {overCap && (
              <p className="text-sm" role="alert">
                <InlineError>
                  {t`One import takes up to ${MAX_TEXT_IMPORT_CARDS} cards. Split the set and import it in parts.`}
                </InlineError>
              </p>
            )}
            {tooBig && (
              <p className="text-sm" role="alert">
                <InlineError>
                  <Trans>
                    This text is larger than 5 MB. Split the set and import it in parts.
                  </Trans>
                </InlineError>
              </p>
            )}
          </section>

          <section aria-labelledby="quizlet-deck" className="grid gap-3">
            <h2 id="quizlet-deck" className="text-md font-medium">
              <Trans>Where the cards go</Trans>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>
                  <Trans>Deck</Trans>
                </FieldLabel>
                <Select
                  value={deck}
                  onValueChange={(v) => setDeck(v ?? NEW_DECK)}
                  items={deckItems}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </Field>
              {deck === NEW_DECK && (
                <Field>
                  <FieldLabel>
                    <Trans>Set name</Trans>
                  </FieldLabel>
                  <Input
                    value={setName}
                    maxLength={80}
                    placeholder={t`Quizlet import`}
                    onChange={(e) => setSetName(e.target.value)}
                  />
                </Field>
              )}
            </div>
          </section>
        </>
      )}

      <div className="grid gap-2">
        <Button
          variant="primary"
          className="justify-self-start"
          disabled={!ready}
          loading={pending}
          onClick={() =>
            onContinue({
              text,
              separators,
              deckName: setName.trim() || t`Quizlet import`,
              deckId: deck === NEW_DECK ? null : deck,
            })
          }
        >
          {cards > 0 && !overCap
            ? plural(cards, { one: "Continue with # card", other: "Continue with # cards" })
            : t`Continue`}
        </Button>
        {message && (
          <p className="text-sm" role="alert">
            <InlineError>{message}</InlineError>
          </p>
        )}
        <a
          href={guideUrl}
          className="justify-self-start text-base font-medium text-text underline underline-offset-4"
        >
          <Trans>Stuck? Read the guide</Trans>
        </a>
      </div>
    </ImportShell>
  );
}

function SeparatorField<Choice extends string>({
  label,
  items,
  choice,
  value,
  presets,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  choice: Choice;
  value: string;
  presets: Partial<Record<Choice, string>>;
  onChange: (separator: string) => void;
}) {
  const { t } = useLingui();
  const [custom, setCustom] = useState(choice === "custom" ? value : "");
  const [picked, setPicked] = useState<string | null>(null);
  const shown = picked === "custom" ? "custom" : choice;
  return (
    <div className="grid gap-2">
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <Select
          value={shown}
          items={items}
          onValueChange={(v) => {
            if (!v) return;
            setPicked(v);
            const preset = presets[v as Choice];
            if (preset !== undefined) onChange(preset);
            else onChange(custom || value);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent />
        </Select>
      </Field>
      {shown === "custom" && (
        <Input
          aria-label={t`Custom separator`}
          value={picked === "custom" ? custom : value}
          maxLength={MAX_SEPARATOR_LENGTH}
          className="font-mono"
          onChange={(e) => {
            setPicked("custom");
            setCustom(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
}
