import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { startUpload } from "@lymi/client/imports";
import {
  detectSeparators,
  encodeTextImport,
  MAX_SEPARATOR_LENGTH,
  MAX_TEXT_IMPORT_BYTES,
  MAX_TEXT_IMPORT_CARDS,
  parseDelimited,
  type TextSeparators,
} from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import { View } from "react-native";
import { useDecks } from "../data/queries";
import { usePalette } from "../theme/palette";
import { clipboard } from "../ui/clipboard";
import { Field, FieldLabel, Input, Textarea } from "../ui/field";
import { Select } from "../ui/menu";
import { Button, Icon, Plate, Text } from "../ui/primitives";
import { ImportShell } from "./shell";
import { pickFile, refusal } from "./sources";
import { Steps } from "./start";

type FieldChoice = "tab" | "comma" | "custom";
type RowChoice = "newline" | "semicolon" | "custom";

const fieldChoice = (sep: string): FieldChoice =>
  sep === "\t" ? "tab" : sep === "," ? "comma" : "custom";
const rowChoice = (sep: string): RowChoice =>
  sep === "\n" ? "newline" : sep === ";" ? "semicolon" : "custom";
const PREVIEW_ROWS = 5;
const NEW_DECK = "new";

/**
 * A Quizlet set by paste, or by a .txt of the same text. The separators are detected and can be
 * changed; the first rows show as they will arrive, with what is skipped. The text goes up as one
 * small file through the same upload as every import, then the shared preview. imports.md.
 */
export function QuizletStart() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const router = useRouter();
  const decks = useDecks();
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<TextSeparators | null>(null);
  const [setName, setSetName] = useState("");
  const [deck, setDeck] = useState<string>(NEW_DECK);
  const [refused, setRefused] = useState<string | null>(null);
  const bytes = useMemo(() => new TextEncoder().encode(text).byteLength, [text]);
  const tooBig = bytes > MAX_TEXT_IMPORT_BYTES;

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

  const own = (decks.data ?? []).filter((d) => d.role === "owner" && !d.archivedAt);
  const deckOptions = [
    { value: NEW_DECK, label: t`A new deck` },
    ...own.map((d) => ({ value: d.id, label: d.name })),
  ];

  const start = useMutation({
    mutationFn: () => {
      const body = new TextEncoder().encode(
        encodeTextImport(
          {
            separators,
            deckName: setName.trim() || t`Quizlet import`,
            deckId: deck === NEW_DECK ? null : deck,
          },
          text,
        ),
      );
      return startUpload(
        { name: "quizlet.txt", size: body.byteLength, part: (s, e) => body.subarray(s, e) },
        qc,
      );
    },
    onSuccess: (item) => router.replace(`/import/${item.id}` as Href),
  });

  const paste = async () => {
    const pasted = await clipboard?.getString().catch(() => "");
    if (!pasted) return;
    setText(pasted);
    setChosen(null);
    setRefused(null);
  };
  const choose = async () => {
    const picked = await pickFile().catch(() => null);
    if (!picked) return;
    const problem = refusal("quizlet", picked);
    if (problem) return setRefused(problem);
    if (picked.size > MAX_TEXT_IMPORT_BYTES) {
      return setRefused(t`This file is larger than 5 MB. Split the set and import it in parts.`);
    }
    setRefused(null);
    setText(await picked.file.text());
    setChosen(null);
    if (!setName) setSetName(picked.name.replace(/\.[^.]+$/, ""));
  };

  const message = refused ?? (start.isError ? errorMessage(start.error) : null);

  return (
    <ImportShell
      title={t`Import from Quizlet`}
      description={t`Paste a set you made in Quizlet. Terms and definitions come across; pictures, audio and progress don’t, so every card starts as new.`}
    >
      <View className="gap-3">
        <Text className="px-1 text-md font-medium text-text" accessibilityRole="header">
          {t`Copying from Quizlet`}
        </Text>
        <Steps
          steps={[
            t`On quizlet.com, open your set, open its … menu and choose Export.`,
            t`Keep Tab and New line. If a card has line breaks, set a custom row separator such as ##.`,
            t`Press Copy text, then paste it here.`,
          ]}
        />
      </View>

      <View className="gap-3">
        <Field>
          <FieldLabel>{t`Your set’s text`}</FieldLabel>
          <Textarea
            value={text}
            onChangeText={(next) => {
              setText(next);
              setRefused(null);
            }}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t`der Hund	the dog`}
            numberOfLines={6}
          />
        </Field>
        <View className="flex-row flex-wrap gap-2">
          {clipboard && <Button label={t`Paste`} icon="copy" onPress={() => void paste()} />}
          <Button label={t`Or choose a .txt file`} icon="fileIn" onPress={() => void choose()} />
        </View>
      </View>

      {parsed && (
        <>
          <View className="gap-3">
            <Text className="px-1 text-md font-medium text-text" accessibilityRole="header">
              {t`Separators`}
            </Text>
            {doubtful && (
              <Text className="px-1 text-base text-danger">
                {t`Check the separators. The preview below shows how they read.`}
              </Text>
            )}
            <Plate className="overflow-hidden">
              <SeparatorRow
                label={t`Between term and definition`}
                options={[
                  { value: "tab", label: t`Tab` },
                  { value: "comma", label: t`Comma` },
                  { value: "custom", label: t`Custom` },
                ]}
                choice={fieldChoice(separators.field)}
                value={separators.field}
                presets={{ tab: "\t", comma: "," }}
                onChange={(field) => setChosen({ ...separators, field })}
              />
              <View className="h-px bg-edge" />
              <SeparatorRow
                label={t`Between rows`}
                options={[
                  { value: "newline", label: t`New line` },
                  { value: "semicolon", label: t`Semicolon` },
                  { value: "custom", label: t`Custom` },
                ]}
                choice={rowChoice(separators.row)}
                value={separators.row}
                presets={{ newline: "\n", semicolon: ";" }}
                onChange={(row) => setChosen({ ...separators, row })}
              />
            </Plate>
          </View>

          <View className="gap-3">
            <Text className="px-1 text-md font-medium text-text" accessibilityRole="header">
              {plural(cards, { one: "# card", other: "# cards" })}
            </Text>
            {cards > 0 && (
              <Plate className="overflow-hidden">
                {parsed.cards.slice(0, PREVIEW_ROWS).map((card, i) => (
                  <View
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id, and repeats are allowed.
                    key={i}
                    className={`gap-0.5 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
                  >
                    <Text className="text-md font-medium text-text">{card.term}</Text>
                    <Text className="text-base text-text-2">{card.definition}</Text>
                  </View>
                ))}
              </Plate>
            )}
            <View className="gap-1 px-1">
              {cards > PREVIEW_ROWS && (
                <Text className="text-sm text-text-2">
                  {plural(cards - PREVIEW_ROWS, {
                    one: "and # more card",
                    other: "and # more cards",
                  })}
                </Text>
              )}
              {parsed.oneSided > 0 && (
                <Text className="text-sm text-text-2">
                  {plural(parsed.oneSided, {
                    one: "# row has only one side, so it’s skipped.",
                    other: "# rows have only one side, so they’re skipped.",
                  })}
                </Text>
              )}
              {parsed.repeated > 0 && (
                <Text className="text-sm text-text-2">
                  {plural(parsed.repeated, {
                    one: "# term appears more than once. Every card is imported.",
                    other: "# terms appear more than once. Every card is imported.",
                  })}
                </Text>
              )}
            </View>
            {overCap && (
              <Text className="px-1 text-base text-danger">
                {t`One import takes up to ${MAX_TEXT_IMPORT_CARDS} cards. Split the set and import it in parts.`}
              </Text>
            )}
            {tooBig && (
              <Text className="px-1 text-base text-danger">
                {t`This text is larger than 5 MB. Split the set and import it in parts.`}
              </Text>
            )}
          </View>

          <View className="gap-3">
            <Text className="px-1 text-md font-medium text-text" accessibilityRole="header">
              {t`Where the cards go`}
            </Text>
            <Plate className="overflow-hidden">
              <Select
                label={t`Deck`}
                value={deck}
                options={deckOptions}
                onChange={setDeck}
                trigger={
                  <ChoiceFace
                    label={t`Deck`}
                    value={deckOptions.find((o) => o.value === deck)?.label ?? ""}
                  />
                }
              />
            </Plate>
            {deck === NEW_DECK && (
              <Field>
                <FieldLabel>{t`Set name`}</FieldLabel>
                <Input
                  value={setName}
                  maxLength={80}
                  placeholder={t`Quizlet import`}
                  onChangeText={setSetName}
                />
              </Field>
            )}
          </View>
        </>
      )}

      <View className="gap-2">
        <Button
          label={
            cards > 0 && !overCap
              ? plural(cards, { one: "Continue with # card", other: "Continue with # cards" })
              : t`Continue`
          }
          variant="primary"
          size="lg"
          disabled={!ready}
          loading={start.isPending}
          onPress={() => start.mutate()}
        />
        {message && (
          <Text className="px-1 text-center text-base text-danger" accessibilityLiveRegion="polite">
            {message}
          </Text>
        )}
      </View>
    </ImportShell>
  );
}

/** A choice on a plate: its name at the start, what is chosen and a chevron at the end. */
function ChoiceFace({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 px-4 py-3">
      <Text className="flex-1 text-md text-text">{label}</Text>
      <Text className="shrink text-md text-text-2" numberOfLines={1}>
        {value}
      </Text>
      <Icon name="down" size={16} colour={p.muted} />
    </View>
  );
}

function SeparatorRow<Choice extends string>({
  label,
  options,
  choice,
  value,
  presets,
  onChange,
}: {
  label: string;
  options: { value: Choice; label: string }[];
  choice: Choice;
  value: string;
  presets: Partial<Record<Choice, string>>;
  onChange: (separator: string) => void;
}) {
  const { t } = useLingui();
  const [custom, setCustom] = useState(choice === "custom" ? value : "");
  const [picked, setPicked] = useState<Choice | null>(null);
  const shown = picked === "custom" ? ("custom" as Choice) : choice;
  return (
    <View>
      <Select
        label={label}
        value={shown}
        options={options}
        onChange={(next) => {
          setPicked(next);
          const preset = presets[next];
          if (preset !== undefined) onChange(preset);
          else onChange(custom || value);
        }}
        trigger={
          <ChoiceFace label={label} value={options.find((o) => o.value === shown)?.label ?? ""} />
        }
      />
      {shown === "custom" && (
        <View className="px-4 pb-3">
          <Input
            accessibilityLabel={t`Custom separator`}
            value={picked === "custom" ? custom : value}
            maxLength={MAX_SEPARATOR_LENGTH}
            autoCorrect={false}
            autoCapitalize="none"
            onChangeText={(next) => {
              setPicked("custom" as Choice);
              setCustom(next);
              onChange(next);
            }}
          />
        </View>
      )}
    </View>
  );
}
