import { Archive } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../../components/Button";
import { SourceChip, StateChip } from "../../components/Chip";
import { DeckCard } from "../../components/DeckCard";
import { NewCardsRow } from "../../components/NewCardsRow";
import { SettingsGroup } from "../../components/SettingsGroup";
import { Switch } from "../../components/Switch";
import { Table as DataTable, Td, Th } from "../../components/Table";
import { Variants } from "../Frame";
import { deckCards } from "../mock";
import type { Group } from "./types";

export const lists: Group = {
  slug: "lists",
  title: "Lists",
  lede: "Decks, new cards and settings, one after another. Rows press down 3%; numbers are tabular.",
  entries: [
    {
      slug: "deck-card",
      name: "Deck card",
      source: "components/DeckCard.tsx",
      note: "A deck in Library is a card, not a row, because four numbers on one line become a run of digits nobody reads.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Due today",
              note: "The due count is the one amber, and it is text.",
              render: () => (
                <div className="w-full">
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
                </div>
              ),
            },
            {
              label: "Nothing due",
              note: "Says when it next asks for something.",
              render: () => (
                <div className="w-full">
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
                </div>
              ),
            },
            {
              label: "Shared with you",
              note: "A joined deck names its owner under the name, the way the join page does.",
              render: () => (
                <div className="w-full">
                  <DeckCard
                    id="d4"
                    name="Eesti keel, A1"
                    language="et"
                    due={5}
                    total={38}
                    known={12}
                    learning={9}
                    owner="Liis"
                    st={{ path: "" }}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "new-cards-row",
      name: "New cards row",
      source: "components/NewCardsRow.tsx",
      note: "What arrived since the last review.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Added by an app",
              note: "Names its actor, because a card an integration wrote must never look like one the learner typed.",
              render: () => (
                <div className="w-full">
                  <NewCardsRow
                    deckId="d1"
                    deckName="Lesson 14"
                    count={12}
                    actor="Claude"
                    when="Tuesday"
                    st={{ path: "" }}
                  />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "settings-group",
      name: "Settings group",
      source: "components/SettingsGroup.tsx",
      note: "One group per concern. Groups are separated by a rule, not boxed.",
      Demo: function SettingsGroupDemo() {
        const [audio, setAudio] = useState(false);
        const [reminder, setReminder] = useState(true);
        return (
          <Variants
            items={[
              {
                label: "Two groups",
                note: "A title, a sentence saying what it governs, then its controls.",
                render: () => (
                  <div className="w-full">
                    <SettingsGroup title="Review" description="How a session sounds and moves.">
                      <Switch
                        checked={audio}
                        onChange={setAudio}
                        label="Play audio automatically"
                      />
                    </SettingsGroup>
                    <SettingsGroup title="Notifications">
                      <Switch
                        checked={reminder}
                        onChange={setReminder}
                        label="Evening reminder"
                        description="Only when cards are due."
                      />
                    </SettingsGroup>
                  </div>
                ),
              },
            ]}
          />
        );
      },
    },
  ],
};

export const table: Group = {
  slug: "table",
  title: "Table",
  lede: "Dense, hairline rows and right-aligned tabular numbers. A row’s action shows on hover and on focus, so the table stays quiet until you reach for it.",
  entries: [
    {
      slug: "table",
      name: "Table",
      source: "components/Table.tsx",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Cards in a deck",
              note: "Hover a row, or tab to it, to reveal Archive. An AI meaning keeps its chip.",
              render: (t) => (
                <div className="w-full">
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>Term</Th>
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
                  </DataTable>
                </div>
              ),
            },
          ]}
        />
      ),
    },
  ],
};
