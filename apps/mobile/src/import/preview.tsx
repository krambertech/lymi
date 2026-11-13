import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Import, type ImportPreview } from "@lymi/client/api";
import { splitNoteTypes } from "@lymi/client/imports";
import { importPreviewQuery, importQuery, usePreviewState } from "@lymi/client/queries";
import { type FieldRole, type ImportSource, isolate, LANGUAGE_TAGS } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";
import { View } from "react-native";
import { languageName } from "../data/languages";
import { formatList } from "../i18n/list";
import { usePalette } from "../theme/palette";
import { Chip } from "../ui/chip";
import { FieldError } from "../ui/field";
import { Select } from "../ui/menu";
import { Button, Icon, Plate, Press, Text } from "../ui/primitives";
import { Tick } from "../welcome/parts";
import { Arrive } from "../welcome/questions";
import {
  deckName,
  Figures,
  Line,
  type NoteType,
  Question,
  SampleCard,
  StepActions,
  StepNote,
  type Summary,
} from "./parts";
import { ImportShell } from "./shell";
import { fileSize, SOURCE_NAMES } from "./sources";

type Choices = {
  languages: Record<string, string | null>;
  roles: Record<string, FieldRole[]>;
  skipDecks: string[];
};

type Step =
  | { id: "decks" }
  | { id: "languages" }
  | { id: "card"; type: NoteType }
  | { id: "summary" };

/** A second look at one answer, shown in place of the step it was opened from. */
type Editing = { kind: "fields"; type: NoteType } | { kind: "languages" } | null;

const ROLE_LABELS: Record<FieldRole, MessageDescriptor> = {
  term: msg`Term`,
  meaning: msg`Meaning`,
  pronunciation: msg`Pronunciation`,
  example: msg`Example`,
  exampleTranslation: msg`Example translation`,
  notes: msg`Notes`,
  skip: msg`Leave out`,
};

/** The kinds of Mochi and Noji card with no template, named here because the server sends a key. */
const MOCHI_KINDS: Record<string, MessageDescriptor> = {
  "content:two": msg`Front and back`,
  "content:one": msg`One side only`,
  "noji:cloze": msg`Cloze`,
};

function useNoteTypeName() {
  const { i18n } = useLingui();
  return (type: NoteType) => {
    const kind = MOCHI_KINDS[type.key];
    return kind ? i18n._(kind) : type.name;
  };
}

/** The preview, one question per screen in the web's order, recounted by the server on each change. imports.md. */
export function ImportPreviewScreen({
  item,
  onCancel,
  cancelling,
}: {
  item: Import;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { t, i18n } = useLingui();
  const qc = useQueryClient();
  const summary = item.summary as Summary;
  const typeName = useNoteTypeName();
  const [choices, setChoices] = useState<Choices>(() => ({
    languages: { ...summary.languages },
    roles: Object.fromEntries(summary.noteTypes.map((type) => [type.key, type.roles])),
    skipDecks: [],
  }));
  const preview = useQuery(importPreviewQuery(item.id, choices));
  const { waiting: previewLoading, error: previewError } = usePreviewState(preview);
  const retryPreview = () => void preview.refetch();
  const confirm = useMutation({
    mutationFn: () => api.confirmImport(item.id, choices),
    onSuccess: (next) => qc.setQueryData(importQuery(item.id).queryKey, next),
  });

  const [at, setAt] = useState(0);
  const [showRest, setShowRest] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const app = SOURCE_NAMES[item.source];
  const leftOut = new Set(choices.skipDecks);
  const chosenDecks = summary.decks.filter((d) => !leftOut.has(d.key));
  // Asked about only when neither the file, the deck's name nor its cards gave a language,
  // judged by what Lymi found so the step doesn't vanish while the learner answers it.
  const unplaced = chosenDecks.filter((d) => (summary.languages[d.key] ?? null) === null);
  // A kind of card found only in decks left out is not asked about.
  const { asked, rest } = useMemo(() => {
    const skipped = new Set(choices.skipDecks);
    return splitNoteTypes(
      summary.noteTypes.filter(
        (type) => !type.decks || type.decks.some((deck) => !skipped.has(deck)),
      ),
    );
  }, [summary.noteTypes, choices.skipDecks]);
  const restNotes = rest.reduce((sum, type) => sum + type.notes, 0);
  const steps: Step[] = [
    ...(summary.decks.length > 1 ? [{ id: "decks" } as const] : []),
    ...(unplaced.length > 0 ? [{ id: "languages" } as const] : []),
    ...(showRest ? [...asked, ...rest] : asked).map((type) => ({ id: "card", type }) as const),
    { id: "summary" },
  ];
  const step = steps[Math.min(at, steps.length - 1)] as Step;
  const next = () => setAt((i) => Math.min(i + 1, steps.length - 1));
  const goBack = at > 0 ? () => setAt(at - 1) : undefined;
  const stepKey = editing
    ? `${editing.kind}-${editing.kind === "fields" ? editing.type.key : ""}`
    : step.id === "card"
      ? `card-${step.type.key}`
      : step.id;
  const setLanguage = (deck: string, value: string | null) =>
    setChoices((c) => ({ ...c, languages: { ...c.languages, [deck]: value } }));
  const data = preview.data;

  let body: ReactNode;
  if (editing?.kind === "fields") {
    body = (
      <FieldsStep
        source={item.source}
        type={editing.type}
        name={typeName(editing.type)}
        roles={choices.roles[editing.type.key] ?? editing.type.roles}
        onSave={(roles) => {
          setChoices((c) => ({ ...c, roles: { ...c.roles, [editing.type.key]: roles } }));
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  } else if (editing?.kind === "languages") {
    body = (
      <>
        <Question
          title={t`Languages`}
          lede={t`Lymi read each deck’s language from ${app}, its name or its cards. It uses the language to find cards you already have and to read terms aloud.`}
        />
        <LanguageRows decks={chosenDecks} languages={choices.languages} onChange={setLanguage} />
        <StepActions>
          <Button
            label={t`Use these languages`}
            variant="primary"
            size="lg"
            onPress={() => setEditing(null)}
          />
        </StepActions>
      </>
    );
  } else if (step.id === "decks") {
    body = (
      <DecksStep
        decks={summary.decks}
        skipDecks={choices.skipDecks}
        onSkipDecks={(skipDecks) => setChoices((c) => ({ ...c, skipDecks }))}
        onNext={next}
      />
    );
  } else if (step.id === "languages") {
    body = (
      <>
        <Question
          title={plural(unplaced.length, {
            one: "What language is this deck in?",
            other: "What language are these decks in?",
          })}
          lede={t`Lymi couldn’t tell from the cards. It uses the language to find cards you already have and to read terms aloud.`}
        />
        <LanguageRows decks={unplaced} languages={choices.languages} onChange={setLanguage} />
        <StepActions onBack={goBack}>
          <Button label={t`Continue`} variant="primary" size="lg" onPress={next} />
        </StepActions>
      </>
    );
  } else if (step.id === "card") {
    body = (
      <CardStep
        key={step.type.key}
        source={item.source}
        type={step.type}
        name={typeName(step.type)}
        samples={data?.samples[step.type.key]}
        loading={previewLoading}
        error={previewError}
        onRetry={retryPreview}
        tail={
          step.type === asked.at(-1) && !showRest && rest.length > 0 ? (
            <View className="gap-1">
              <Text className="text-base text-ink-secondary">
                {plural(restNotes, {
                  one: "# more note of a less common kind is imported as it is.",
                  other: "# more notes of less common kinds are imported as they are.",
                })}
              </Text>
              <View className="flex-row">
                <Button
                  label={t`Check those too`}
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setShowRest(true);
                    next();
                  }}
                />
              </View>
            </View>
          ) : null
        }
        onChangeFields={() => setEditing({ kind: "fields", type: step.type })}
        onBack={goBack}
        onNext={next}
      />
    );
  } else {
    const updating = data && data.added === 0 && data.existing > 0;
    const answers: { title: string; detail: string; change: string; onPress: () => void }[] = [
      ...(summary.decks.length > 1
        ? [
            {
              title: t`Decks`,
              change: t`Change decks`,
              detail:
                leftOut.size === 0
                  ? plural(summary.decks.length, { other: "All # decks" })
                  : plural(summary.decks.length, { other: `${chosenDecks.length} of # decks` }),
              onPress: () => setAt(steps.findIndex((s) => s.id === "decks")),
            },
          ]
        : []),
      {
        title: t`Languages`,
        change: t`Change languages`,
        detail: formatList(
          [...new Set(chosenDecks.map((d) => choices.languages[d.key] ?? null))].map((tag) =>
            tag ? languageName(tag) : t`No language`,
          ),
          i18n.locale,
        ),
        onPress: () => setEditing({ kind: "languages" }),
      },
      ...(asked.length > 0
        ? [
            {
              title: t`Cards`,
              change: t`Check the cards again`,
              detail:
                asked.length > 1 ? plural(asked.length, { other: "# kinds checked" }) : t`Checked`,
              onPress: () => setAt(steps.findIndex((s) => s.id === "card")),
            },
          ]
        : []),
    ];
    body = (
      <>
        <Question
          title={
            updating
              ? plural(data.existing, {
                  one: "Ready to update # card",
                  other: "Ready to update # cards",
                })
              : plural(data?.added ?? 0, {
                  one: "Ready to import # card",
                  other: "Ready to import # cards",
                })
          }
        />
        {/* Noji exports where each card stands, never its past reviews, so there are none to count. */}
        <Figures
          figures={[
            { label: t`cards`, value: previewLoading ? undefined : data?.added },
            { label: t`known`, value: previewLoading ? undefined : data?.known },
            ...(item.source !== "noji"
              ? [
                  {
                    label: t`past reviews`,
                    value: previewLoading ? undefined : data?.reviews,
                  },
                ]
              : []),
          ]}
        />
        {previewError && <PreviewError error={previewError} onRetry={retryPreview} />}
        {data && <ImportLines item={item} summary={summary} preview={data} />}
        <Plate className="overflow-hidden">
          {answers.map((answer, i) => (
            <Press
              key={answer.title}
              onPress={answer.onPress}
              scale={0.99}
              accessibilityRole="button"
              accessibilityLabel={`${answer.change}: ${answer.detail}`}
            >
              <View
                className={`min-h-[52px] flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm text-ink-muted">{answer.title}</Text>
                  <Text className="text-md text-ink" numberOfLines={2}>
                    {answer.detail}
                  </Text>
                </View>
                <Text className="text-md font-medium text-ink-secondary">{t`Change`}</Text>
              </View>
            </Press>
          ))}
        </Plate>
        <StepActions
          onBack={goBack}
          note={
            confirm.isError ? (
              <Text className="px-1 text-center text-base text-danger">
                {errorMessage(confirm.error)}
              </Text>
            ) : (
              <StepNote>{t`You can undo the whole import later from Activity.`}</StepNote>
            )
          }
        >
          <Button
            label={
              updating
                ? plural(data.existing, { one: "Update # card", other: "Update # cards" })
                : plural(data?.added ?? 0, { one: "Import # card", other: "Import # cards" })
            }
            variant="primary"
            size="lg"
            loading={confirm.isPending}
            disabled={!data}
            onPress={() => data && confirm.mutate()}
          />
        </StepActions>
        <Button label={t`Cancel import`} variant="ghost" loading={cancelling} onPress={onCancel} />
      </>
    );
  }

  return (
    <ImportShell
      title={t`Import from ${app}`}
      description={t`${isolate(item.fileName)} · ${fileSize(item.byteSize)}`}
      scrollKey={stepKey}
    >
      <Arrive key={stepKey}>
        <View className="gap-6">{body}</View>
      </Arrive>
    </ImportShell>
  );
}

/** Which of the file's decks come into Lymi, for a collection that holds decks the learner no longer uses. */
function DecksStep({
  decks,
  skipDecks,
  onSkipDecks,
  onNext,
}: {
  decks: Summary["decks"];
  skipDecks: string[];
  onSkipDecks: (skipDecks: string[]) => void;
  onNext: () => void;
}) {
  const { t, i18n } = useLingui();
  const [error, setError] = useState(false);
  const left = new Set(skipDecks);
  const chosen = decks.filter((d) => !left.has(d.key));
  const cards = chosen.reduce((sum, d) => sum + d.cards, 0);
  const set = (next: Set<string>) => {
    onSkipDecks(decks.filter((d) => next.has(d.key)).map((d) => d.key));
    setError(false);
  };
  const count = (n: number) => i18n.number(n);
  return (
    <>
      <Question
        title={t`Which decks do you want in Lymi?`}
        lede={t`Leave out the ones you don’t use anymore. You can import them from the same file later.`}
      />
      <View className="gap-2">
        <View className="flex-row">
          <Button
            label={left.size === 0 ? t`Clear all` : t`Select all`}
            variant="ghost"
            size="sm"
            onPress={() => set(left.size === 0 ? new Set(decks.map((d) => d.key)) : new Set())}
          />
        </View>
        <Plate className="overflow-hidden">
          {decks.map((deck, i) => {
            const known = deck.known ?? 0;
            const on = !left.has(deck.key);
            const line =
              known === 0
                ? plural(deck.cards, { one: "# card", other: "# cards" })
                : known >= deck.cards
                  ? plural(deck.cards, { one: "# card, known", other: "# cards, all known" })
                  : plural(deck.cards, {
                      one: `# card · ${count(known)} known`,
                      other: `# cards · ${count(known)} known`,
                    });
            return (
              <CheckRow
                key={deck.key}
                first={i === 0}
                title={deckName(deck.name)}
                line={line}
                checked={on}
                onPress={() => {
                  const next = new Set(left);
                  if (on) next.add(deck.key);
                  else next.delete(deck.key);
                  set(next);
                }}
              />
            );
          })}
        </Plate>
      </View>
      <StepActions
        note={
          error ? (
            <Text className="px-1 text-center text-base text-danger">{t`Choose at least one deck.`}</Text>
          ) : (
            <StepNote>
              {plural(cards, {
                one: `# card in ${chosen.length} of ${decks.length} decks`,
                other: `# cards in ${chosen.length} of ${decks.length} decks`,
              })}
            </StepNote>
          )
        }
      >
        <Button
          label={t`Continue`}
          variant="primary"
          size="lg"
          onPress={() => (chosen.length === 0 ? setError(true) : onNext())}
        />
      </StepActions>
    </>
  );
}

/** A row the whole of which ticks its box. */
function CheckRow({
  first,
  title,
  line,
  checked,
  onPress,
}: {
  first: boolean;
  title: string;
  line: string;
  checked: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      scale={0.99}
      haptic
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${title}, ${line}`}
    >
      <View
        className={`min-h-[56px] flex-row items-center gap-3 px-4 py-2.5 ${first ? "" : "border-t border-edge"}`}
      >
        {checked ? (
          <Tick />
        ) : (
          <View
            className="size-6 rounded-full border-2"
            style={{ borderColor: p["edge-strong"] }}
          />
        )}
        <View className="flex-1 gap-0.5">
          <Text className="text-md text-ink" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-sm text-ink-muted">{line}</Text>
        </View>
      </View>
    </Press>
  );
}

/** Each deck's language as a row that opens the searched list of languages. */
function LanguageRows({
  decks,
  languages,
  onChange,
}: {
  decks: Summary["decks"];
  languages: Record<string, string | null>;
  onChange: (deck: string, value: string | null) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const options = useMemo(
    () => [
      { value: "", label: t`No language` },
      ...LANGUAGE_TAGS.map((tag) => ({ value: tag as string, label: languageName(tag) })).sort(
        (a, b) => a.label.localeCompare(b.label),
      ),
    ],
    [t],
  );
  return (
    <Plate className="overflow-hidden">
      {decks.map((deck, i) => {
        const value = languages[deck.key] ?? "";
        const label = value ? languageName(value) : t`No language`;
        return (
          <Select
            key={deck.key}
            label={deckName(deck.name)}
            value={value}
            options={options}
            onChange={(next) => onChange(deck.key, next || null)}
            trigger={
              <View
                className={`min-h-[56px] flex-row items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-edge" : ""}`}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-md text-ink" numberOfLines={2}>
                    {deckName(deck.name)}
                  </Text>
                  <Text className="text-sm text-ink-muted">
                    {plural(deck.cards, { one: "# card", other: "# cards" })}
                  </Text>
                </View>
                <Text className="shrink text-md text-ink-secondary" numberOfLines={1}>
                  {label}
                </Text>
                <Icon name="down" size={16} colour={p["ink-muted"]} />
              </View>
            }
          />
        );
      })}
    </Plate>
  );
}

/** Why the count failed, with the way to ask again. */
function PreviewError({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { t } = useLingui();
  return (
    <View className="gap-2">
      <FieldError>{error}</FieldError>
      <View className="flex-row">
        <Button label={t`Try again`} variant="ghost" size="sm" onPress={onRetry} />
      </View>
    </View>
  );
}

/** One kind of card, drawn the way it will arrive, asking whether it looks right. */
function CardStep({
  source,
  type,
  name,
  samples,
  loading,
  error,
  onRetry,
  tail,
  onChangeFields,
  onBack,
  onNext,
}: {
  source: ImportSource;
  type: NoteType;
  name: string;
  samples: ImportPreview["samples"][string] | undefined;
  loading: boolean;
  error?: string | undefined;
  onRetry: () => void;
  tail: ReactNode;
  onChangeFields: () => void;
  onBack?: (() => void) | undefined;
  onNext: () => void;
}) {
  const { t } = useLingui();
  const [index, setIndex] = useState(0);
  const list = samples ?? [];
  const sample = list[index % Math.max(list.length, 1)];
  const count =
    source !== "anki"
      ? plural(type.notes, { one: "# card", other: "# cards" })
      : plural(type.notes, { one: "# note", other: "# notes" });
  return (
    <>
      <Question
        title={t`Does this card look right?`}
        lede={t`This is how it will look in Lymi. Change fields if a part is in the wrong place.`}
      />
      <Plate className="gap-4 p-5">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Chip size="sm">{`${name} · ${count}`}</Chip>
          {list.length > 1 && (
            <Button
              label={t`Show another`}
              variant="ghost"
              size="sm"
              onPress={() => setIndex(index + 1)}
            />
          )}
        </View>
        <SampleCard sample={sample} loading={loading} error={error} onRetry={onRetry} />
      </Plate>
      {error && sample && <PreviewError error={error} onRetry={onRetry} />}
      {tail}
      <StepActions onBack={onBack}>
        <Button label={t`Looks right`} icon="check" variant="primary" size="lg" onPress={onNext} />
        <Button label={t`Change fields`} size="lg" onPress={onChangeFields} />
      </StepActions>
    </>
  );
}

/** What each field of one kind of card becomes, with the first card's text under its name. */
function FieldsStep({
  source,
  type,
  name,
  roles,
  onSave,
  onCancel,
}: {
  source: ImportSource;
  type: NoteType;
  name: string;
  roles: FieldRole[];
  onSave: (roles: FieldRole[]) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const [draft, setDraft] = useState<FieldRole[]>(roles);
  const [error, setError] = useState<string | null>(null);
  const options = (Object.keys(ROLE_LABELS) as FieldRole[]).map((role) => ({
    value: role,
    label: i18n._(ROLE_LABELS[role]),
  }));
  const example = type.samples[0] ?? [];
  const lede =
    source === "mochi"
      ? t`Choose what each Mochi field becomes on a Lymi card. One field is the term.`
      : source === "noji"
        ? t`Choose what each side of a Noji card becomes on a Lymi card. One side is the term.`
        : source === "lymi"
          ? t`Choose what each field becomes on the new card. One field is the term.`
          : t`Choose what each Anki field becomes on a Lymi card. One field is the term.`;
  return (
    <>
      <Question title={t`Fields of ${{ name: isolate(name) }}`} lede={lede} />
      <Plate className="overflow-hidden">
        {type.fields.map((field, i) => {
          const role = draft[i] ?? "skip";
          return (
            <Select
              // biome-ignore lint/suspicious/noArrayIndexKey: a note type can repeat a field name, and its fields never reorder
              key={`${field}-${i}`}
              label={t`${field} becomes`}
              value={role}
              options={options}
              onChange={(value) => {
                setError(null);
                setDraft((current) => current.map((r, j) => (j === i ? value : r)));
              }}
              trigger={
                <View
                  className={`min-h-[56px] flex-row items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-edge" : ""}`}
                >
                  <View className="flex-1 gap-0.5">
                    <Text className="text-md text-ink" numberOfLines={1}>
                      {field}
                    </Text>
                    <Text className="text-sm text-ink-muted" numberOfLines={1}>
                      {example[i] ||
                        (source !== "anki"
                          ? t`Empty in the first card`
                          : t`Empty in the first note`)}
                    </Text>
                  </View>
                  <Text
                    className={`text-md ${role === "skip" ? "text-ink-muted" : "font-medium text-ink"}`}
                  >
                    {i18n._(ROLE_LABELS[role] ?? ROLE_LABELS.skip)}
                  </Text>
                  <Icon name="down" size={16} colour={p["ink-muted"]} />
                </View>
              }
            />
          );
        })}
      </Plate>
      <StepActions
        onBack={onCancel}
        note={
          error ? <Text className="px-1 text-center text-base text-danger">{error}</Text> : null
        }
      >
        <Button
          label={t`Use these fields`}
          variant="primary"
          size="lg"
          onPress={() => {
            if (draft.filter((role) => role === "term").length !== 1) {
              setError(t`Choose exactly one field as the term.`);
              return;
            }
            onSave(draft);
          }}
        />
      </StepActions>
    </>
  );
}

/** What the import keeps and what it leaves, one plain line each. */
function ImportLines({
  item,
  summary,
  preview,
}: {
  item: Import;
  summary: Summary;
  preview: ImportPreview;
}) {
  const { t } = useLingui();
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const app = SOURCE_NAMES[item.source];
  const known = preview.known;
  // New Mochi cards with no side break; the adapter names their kind by this key.
  const oneSided = preview.addedByNoteType["content:one"] ?? 0;
  return (
    <View className="gap-2.5">
      {known > 0 && (
        <Line tone="good">
          {plural(known, {
            one: `# card you know in ${app} comes in as Known, so it doesn’t start over.`,
            other: `# cards you know in ${app} come in as Known, so they don’t start over.`,
          })}
        </Line>
      )}
      {item.source === "noji" ? (
        known > 0 ? (
          <Line tone="good">{t`Cards keep the due dates they had in Noji.`}</Line>
        ) : (
          <Line tone="skip">
            {t`This file has no learning progress, so every card starts as new. To keep your progress, export again with learning progress turned on.`}
          </Line>
        )
      ) : preview.reviews > 0 ? (
        <>
          <Line tone="good">{t`Cards keep the due dates they had in ${app}.`}</Line>
          <Line tone="good">
            {t`Past reviews show in Insights on the days you did them. They don’t count toward today’s goal or your streak.`}
          </Line>
        </>
      ) : summary.reviews > 0 ? null : (
        <Line tone="skip">
          {item.source !== "anki"
            ? t`This file has no review history, so every card starts as new.`
            : t`This file has no review history, so every card starts as new. To keep your progress, export again with Include Scheduling Information ticked.`}
        </Line>
      )}
      {preview.pictures > 0 && (
        <Line tone="good">
          {plural(preview.pictures, {
            one: "# card brings its picture.",
            other: "# cards bring their pictures.",
          })}
        </Line>
      )}
      {preview.recordings > 0 && (
        <Line tone="good">
          {plural(preview.recordings, {
            one: "# card brings its recording. Lymi plays it instead of reading the term aloud.",
            other:
              "# cards bring their recordings. Lymi plays them instead of reading the terms aloud.",
          })}
        </Line>
      )}
      {(preview.exampleRecordings ?? 0) > 0 && (
        <Line tone="good">
          {plural(preview.exampleRecordings ?? 0, {
            one: "# example brings its recording. Lymi plays it instead of reading the example aloud.",
            other:
              "# examples bring their recordings. Lymi plays them instead of reading the examples aloud.",
          })}
        </Line>
      )}
      {preview.existing > 0 && (
        <Line tone="good">
          {plural(preview.existing, {
            one: "# card was in an earlier import. Only its empty fields are filled.",
            other: "# cards were in an earlier import. Only their empty fields are filled.",
          })}
        </Line>
      )}
      {preview.duplicates > 0 && (
        <Press
          onPress={() => setDuplicatesOpen(!duplicatesOpen)}
          accessibilityRole="button"
          accessibilityState={{ expanded: duplicatesOpen }}
        >
          <Line tone="skip">
            {plural(preview.duplicates, {
              one: "# card is already in your decks, so it’s skipped.",
              other: "# cards are already in your decks, so they’re skipped.",
            })}
          </Line>
          {duplicatesOpen && (
            <View className="gap-1 ps-7 pt-2">
              {preview.duplicateExamples.map((d) => (
                <Text key={`${d.term}-${d.deckName}`} className="text-sm text-ink-secondary">
                  {t`${isolate(d.term)} in ${isolate(d.deckName)}`}
                </Text>
              ))}
              {preview.duplicates > preview.duplicateExamples.length && (
                <Text className="text-sm text-ink-muted">
                  {plural(preview.duplicates - preview.duplicateExamples.length, {
                    one: "and # more",
                    other: "and # more",
                  })}
                </Text>
              )}
            </View>
          )}
        </Press>
      )}
      {preview.archived > 0 && (
        <Line tone="skip">
          {item.source === "lymi"
            ? plural(preview.archived, {
                one: "# archived card arrives archived.",
                other: "# archived cards arrive archived.",
              })
            : item.source === "mochi"
              ? plural(preview.archived, {
                  one: "# card you archived in Mochi arrives archived.",
                  other: "# cards you archived in Mochi arrive archived.",
                })
              : item.source === "noji"
                ? plural(preview.archived, {
                    one: "# card you froze in Noji arrives archived.",
                    other: "# cards you froze in Noji arrive archived.",
                  })
                : plural(preview.archived, {
                    one: "# suspended card arrives archived.",
                    other: "# suspended cards arrive archived.",
                  })}
        </Line>
      )}
      {preview.shortened > 0 && (
        <Line tone="skip">
          {plural(preview.shortened, {
            one: "# card has text that’s too long, so part of it moves to notes or is cut.",
            other: "# cards have text that’s too long, so part of it moves to notes or is cut.",
          })}
        </Line>
      )}
      {preview.recordingsSkipped > 0 && (
        <Line tone="skip">
          {plural(preview.recordingsSkipped, {
            one: "# recording is in a format Lymi can’t play, so Lymi reads that term aloud itself.",
            other:
              "# recordings are in a format Lymi can’t play, so Lymi reads those terms aloud itself.",
          })}
        </Line>
      )}
      {(preview.exampleRecordingsSkipped ?? 0) > 0 && (
        <Line tone="skip">
          {plural(preview.exampleRecordingsSkipped ?? 0, {
            one: "# example recording is in a format Lymi can’t play, so Lymi reads that example aloud itself.",
            other:
              "# example recordings are in a format Lymi can’t play, so Lymi reads those examples aloud itself.",
          })}
        </Line>
      )}
      {preview.audio > 0 && (
        <Line tone="skip">
          {plural(preview.audio, {
            one: "# clip is left out. A card keeps one recording of its term and one of its example.",
            other:
              "# clips are left out. A card keeps one recording of its term and one of its example.",
          })}
        </Line>
      )}
      {preview.pitchSkipped > 0 && (
        <Line tone="skip">
          {plural(preview.pitchSkipped, {
            one: "# card’s pitch accent can’t be read as text, so it’s skipped.",
            other: "# cards’ pitch accents can’t be read as text, so they’re skipped.",
          })}
        </Line>
      )}
      {oneSided > 0 && (
        <Line tone="skip">
          {plural(oneSided, {
            one: "# card has no --- line, so it’s imported with a term and no meaning.",
            other: "# cards have no --- line, so they’re imported with a term and no meaning.",
          })}
        </Line>
      )}
      {preview.unsupported + preview.skipped > 0 && (
        <Line tone="skip">
          {item.source === "noji"
            ? plural(preview.unsupported + preview.skipped, {
                one: "# card is image occlusion or has no term, so it’s skipped.",
                other: "# cards are image occlusion or have no term, so they’re skipped.",
              })
            : item.source !== "anki"
              ? plural(preview.skipped, {
                  one: "# card has no term, so it’s skipped.",
                  other: "# cards have no term, so they’re skipped.",
                })
              : plural(preview.unsupported + preview.skipped, {
                  one: "# note is image occlusion or has no term, so it’s skipped.",
                  other: "# notes are image occlusion or have no term, so they’re skipped.",
                })}
        </Line>
      )}
    </View>
  );
}
