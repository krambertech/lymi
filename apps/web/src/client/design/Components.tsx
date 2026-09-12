import { streakLength } from "@lymi/core";
import { Archive, Download, MoreHorizontal, Pencil, Search, Volume2, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Chip, SourceChip, StateChip } from "../components/Chip";
import { Select } from "../components/Combobox";
import { DeckCard } from "../components/DeckCard";
import { LanguageField } from "../components/DeckFields";
import { Dialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import { Field, Input, Textarea } from "../components/Field";
import { Flame } from "../components/Flame";
import { Kbd } from "../components/Kbd";
import { Menu, MenuItem, MenuList, MenuSeparator, MenuTrigger } from "../components/Menu";
import { NewCardsRow } from "../components/NewCardsRow";
import { Progress } from "../components/Progress";
import { Segmented } from "../components/Segmented";
import { SevenLights } from "../components/SevenLights";
import { Skeleton } from "../components/Skeleton";
import { Switch } from "../components/Switch";
import { Table, Td, Th } from "../components/Table";
import { Toast } from "../components/Toast";
import { Pair, Section, Specimen, Sub } from "./Frame";
import { deckCards, history, streakDays } from "./mock";

const DECKS = [
  { value: "d1", label: "Lesson 14" },
  { value: "d2", label: "Portuguese" },
  { value: "d3", label: "Українська для Марко" },
];

export function Components() {
  const [seg, setSeg] = useState("recognise");
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [text, setText] = useState("");
  const [deck, setDeck] = useState<string | null>("d1");
  const [deckEmpty, setDeckEmpty] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>("it");
  const [langEmpty, setLangEmpty] = useState<string | null>(null);
  return (
    <Section
      id="components"
      title="Components"
      lede="Standard controls that look like what they are. Every interactive component has default, hover, focus, active, disabled and, where it applies, loading. One primary per view. Buttons and rows press down 3%; nothing lifts."
    >
      <Sub
        title="Buttons"
        note="Primary is amber and appears once per view. Secondary is a plate with an edge. Ghost has no plate until hovered. Danger is soft until hovered. A kbd hint shows on desktop only."
      >
        <Pair>
          {() => (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" kbd="R">
                  Review 11 due
                </Button>
                <Button kbd="N">Add word</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger">
                  <Archive aria-hidden="true" />
                  Archive deck
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg">
                  Done
                </Button>
                <Button size="md">Create</Button>
                <Button size="sm">Rename</Button>
                <Button variant="primary" loading>
                  Adding
                </Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <IconButton label="Play pronunciation" variant="secondary" round>
                  <Volume2 />
                </IconButton>
                <IconButton label="Deck options" size="sm">
                  <MoreHorizontal />
                </IconButton>
                <IconButton label="Leave review" size="sm">
                  <X />
                </IconButton>
                <span className="text-xs text-muted">
                  Icons: Lucide at its 2 px stroke, 18 px in buttons, 22 px in the tab bar.
                </span>
              </div>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Fields"
        note="Label above, hint or error below, wired with aria. Every control is the same box: 44 px on the phone, 40 on the desktop, 16 px text so iOS does not zoom. A form is one row repeated, not a pile of different objects. Errors carry an icon, never colour alone, and arrive on submit rather than by taking the button away."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @xl:grid-cols-2">
              <Field label="Word or phrase">
                <Input placeholder="sbrigarsi" defaultValue="la ringhiera" />
              </Field>
              <Field
                label="Meaning"
                aside="Optional"
                hint="Leave it empty and AI can suggest one later."
              >
                <Input placeholder="to hurry up" />
              </Field>
              <Field label="Source" error="Keep it under 200 characters.">
                <Input defaultValue="Il Gattopardo, chapter two, the long passage about the ballroom and everything Tancredi said" />
              </Field>
              <Field label="Notes" className="@xl:col-span-2">
                <Textarea
                  placeholder="Grammar, a mnemonic, where you heard it"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </Field>
              <Field label="Disabled">
                <Input disabled defaultValue="Not now" />
              </Field>
              <div className="relative self-end">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input placeholder="Search this deck" aria-label="Search" className="pl-9" />
              </div>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Select and Combobox"
        note="Both are the same box as every other control. Open, a panel floats under the box in the top layer, so the form does not move. Select is for a short list: the arrows walk it and typing a letter jumps to a name. Combobox is for a list of forty: the panel starts with a search field and the names filter as you type. The chosen row leads with a check, and every row keeps that room so nothing shifts when one is chosen."
      >
        <Pair>
          {() => (
            <div className="grid gap-4 @xl:grid-cols-2">
              <Field label="Deck">
                <Select value={deck} onChange={setDeck} options={DECKS} />
              </Field>
              <Field label="Deck" hint="Nothing chosen yet.">
                <Select
                  value={deckEmpty}
                  onChange={setDeckEmpty}
                  options={DECKS}
                  placeholder="Choose a deck"
                />
              </Field>
              <LanguageField value={lang} onChange={setLang} hint="Forty names, so it searches." />
              <LanguageField
                value={langEmpty}
                onChange={setLangEmpty}
                error="Choose the language the words are in."
              />
              <Field label="Deck" hint="Cannot change while a review is running.">
                <Select value={deck} onChange={setDeck} options={DECKS} disabled />
              </Field>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Selection"
        note="Segmented for two to four views of the same thing. Switch for settings that apply at once. Checkbox for lists."
      >
        <Pair>
          {() => (
            <div className="grid gap-5">
              <Segmented
                label="Direction"
                value={seg}
                onChange={setSeg}
                options={[
                  { value: "recognise", label: "IT → EN" },
                  { value: "produce", label: "EN → IT" },
                  { value: "both", label: "Both" },
                ]}
              />
              <Switch
                checked={sw}
                onChange={setSw}
                label="Play audio automatically"
                description="Off by default. Audio always has a visible control."
              />
              <Checkbox checked={cb} onChange={setCb} label="Also archive its review history" />
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Chips and labels"
        note="Status chips carry a dot and a word. Source chips say who wrote a field; AI gets a dashed edge on top of the label so it is never mistaken for the lesson."
      >
        <Pair>
          {() => (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <StateChip state={0} />
                <StateChip state={1} />
                <StateChip state={3} />
                <StateChip state={2} />
                <Chip>Lesson 14</Chip>
                <Chip tone="danger">Archived</Chip>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SourceChip source="lesson" field="meaning" />
                <SourceChip source="ai" field="meaning" />
                <SourceChip source="manual" field="example" />
                <SourceChip source="ai" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Kbd>N</Kbd>
                <Kbd>R</Kbd>
                <Kbd>Space</Kbd>
                <Kbd>1 – 4</Kbd>
                <Kbd>Esc</Kbd>
                <span className="inline-flex rounded-md bg-amber px-3 py-1.5 text-sm text-amber-ink">
                  on amber{" "}
                  <Kbd tone="on-primary" className="ml-2">
                    R
                  </Kbd>
                </span>
              </div>
            </div>
          )}
        </Pair>
      </Sub>

      <Sub
        title="Feedback"
        note="Progress is a 3 px track. Toasts are the text colour with one amber action and never stack. Skeletons hold the loaded shape. Empty states teach."
      >
        <Pair>
          {() => (
            <div className="grid gap-6">
              <Progress value={0.46} label="Session progress" />
              <Toast inline action={{ label: "Undo", onClick: () => {} }}>
                Archived “sbrigarsi”
              </Toast>
              <div className="grid gap-2">
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
              </div>
              <SevenLights days={history} />
              {/* The streak, as Today composes it: the flame counts the run, the week says
                  which days and how full each was. No panel. */}
              <div className="grid justify-items-center gap-3.5">
                <p className="flex items-center gap-2 text-md font-medium tabular-nums text-text-2">
                  <Flame className="size-7" flicker />
                  {streakLength(streakDays)} days in a row
                </p>
                <SevenLights days={streakDays.slice(-7)} size="lg" />
              </div>
              <Avatar name="Kateryna" size={34} />
            </div>
          )}
        </Pair>
        <Pair>
          {() => (
            <EmptyState
              title="Nothing here yet"
              body="Make a deck, add a word from your last lesson, and the lantern comes on."
              action={<Button variant="primary">Make a deck</Button>}
              className="py-4"
            />
          )}
        </Pair>
      </Sub>

      <Sub
        title="Overlays"
        note="A menu for a few actions behind one button. A dialog only when there is no way back; Lymi prefers Undo. A sheet is not that dialog, and it takes the shape of the machine: a drawer on the phone, a centred modal on a desktop. Both are on the Screens section."
      >
        <Specimen className="gap-4">
          <Menu>
            <MenuTrigger>
              {(p) => (
                <Button size="sm" {...p}>
                  Deck options
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              )}
            </MenuTrigger>
            <MenuList align="start">
              <MenuItem icon={<Pencil />}>Rename</MenuItem>
              <MenuItem icon={<Download />} kbd="⌘E">
                Export as CSV
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Archive />} tone="danger">
                Archive deck
              </MenuItem>
            </MenuList>
          </Menu>
          <Button size="sm" onClick={() => setDialog(true)}>
            Open dialog
          </Button>
          <Dialog
            open={dialog}
            onClose={() => setDialog(false)}
            title="Delete this account?"
            actions={
              <>
                <Button variant="ghost" onClick={() => setDialog(false)}>
                  Keep it
                </Button>
                <Button variant="danger" onClick={() => setDialog(false)}>
                  Delete account
                </Button>
              </>
            }
          >
            Every deck, card and review goes with it. This is the one action in Lymi that cannot be
            undone.
          </Dialog>
        </Specimen>
      </Sub>

      <Sub
        title="Lists and tables"
        note="A deck card has a face: its name and language, the stripe that says how its words split, and the one thing it asks today. A row of new cards names the actor, because an integration’s card must never look like one you typed. A table: dense, hairline rows, right-aligned tabular numbers."
      >
        <Pair stack>
          {(t) => (
            <div className="grid gap-4">
              <DeckCard
                id="d1"
                name="Italian with Giulia"
                language="it"
                due={8}
                total={64}
                known={31}
                learning={14}
                st={{ path: "" }}
              />
              <DeckCard
                id="d2"
                name="Portuguese"
                language="pt-BR"
                due={0}
                total={41}
                known={26}
                learning={9}
                next="Monday"
                st={{ path: "" }}
              />
              <NewCardsRow
                deckId="d1"
                deckName="Lesson 14"
                count={12}
                actor="Claude"
                when="Tuesday"
                st={{ path: "" }}
              />
              <Table>
                <thead>
                  <tr>
                    <Th>Word</Th>
                    <Th>Meaning</Th>
                    <Th>Status</Th>
                    <Th align="right">Next</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {deckCards.slice(0, 4).map(({ card, state }) => (
                    <tr
                      key={`${t}-${card.id}`}
                      className="group transition-colors hoverable:hover:bg-plate"
                    >
                      <Td className="whitespace-nowrap text-md font-medium">{card.term}</Td>
                      <Td className="text-text-2">
                        <span className="flex flex-wrap items-center gap-2">
                          {card.meaning}
                          {card.meaningSource === "ai" && (
                            <SourceChip source="ai" field="meaning" />
                          )}
                        </span>
                      </Td>
                      <Td>
                        <StateChip state={state?.state} />
                      </Td>
                      <Td align="right" className="text-muted">
                        {state && state.due.getTime() <= Date.now() ? "today" : "6 d"}
                      </Td>
                      <Td className="py-1.5">
                        <IconButton
                          label={`Archive ${card.term}`}
                          size="sm"
                          className="transition-opacity focus-visible:opacity-100 hoverable:opacity-0 hoverable:group-hover:opacity-100"
                        >
                          <Archive />
                        </IconButton>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Pair>
      </Sub>
    </Section>
  );
}
