import { H2, Lead, NextLinks, Note } from "../Prose";

export function Decks() {
  return (
    <div className="doc-prose">
      <Lead>
        A deck holds cards you review together. Use sections for parts of one deck, series for
        several decks, and tags to find cards across decks.
      </Lead>
      <H2>Organize your cards</H2>
      <p>
        Open a deck to search its cards, filter by state, due date or tags, and change the sort
        order. Choose <strong>Select cards</strong> from its menu to work with several cards: review
        them, mark them important, or, on a deck you own, change tags, move or archive them.
      </p>
      <p>
        An important card is more likely to come up when there is more to review than your goal.
        Marking it does not change its schedule.
      </p>
      <H2>Sections inside a deck</H2>
      <p>
        Use a section for a lesson or another part of a deck. The owner creates and arranges
        sections in the deck’s settings, and moves cards between them. Every learner sees the same
        sections.
      </p>
      <p>
        By default, sections open in order. The next opens once every card in the current section
        has come up and 80% are Known. The owner can instead make the next section wait for the
        learner to choose <strong>Start</strong>, or open all sections at once.{" "}
        <strong>Start anyway</strong> opens a later section early, with those before it. Cards you
        already started stay in review.
      </p>
      <H2>Series of decks</H2>
      <p>
        Choose <strong>New series</strong> from Library’s menu to group your own decks and review
        them together. A deck belongs to at most one series. Your series are private; someone who
        joins one of your decks does not see how you grouped it.
      </p>
      <Note title="Deleting a series">
        Deleting a series is permanent. Choose whether its decks stay in Library or are archived
        with it. Archived decks can be restored, but the series itself cannot.
      </Note>
      <H2>Share a deck</H2>
      <p>
        Open a deck you own and open its settings. Under <strong>Visibility</strong>, choose{" "}
        <strong>Anyone with the link</strong>, then copy the join link and send it to the people you
        want to study with. Anyone with that link can join while it is on. Turn it off to stop new
        joins.
      </p>
      <p>
        Members see the owner’s cards and later edits, with their own due dates and review history.
        Only the owner changes the cards. Members cannot export the deck, and can choose{" "}
        <strong>Leave</strong> when they no longer want to study it.
      </p>
      <H2>Find a ready-made deck</H2>
      <p>
        Open <strong>Explore</strong> to browse published decks by language or subject. Choose a
        deck and add it to Library. Like a deck joined through a link, its cards stay with the owner
        and your review progress is yours.
      </p>
      <H2>Archive and restore</H2>
      <p>
        Archive a card, section or deck to keep it out of review. Restoring brings it back with its
        schedule. Archiving a section asks whether to archive its cards too or keep them in the deck
        without a section.
      </p>
      <NextLinks
        items={[
          {
            to: "/docs/getting-started",
            title: "Getting started",
            blurb: "Add your first cards and begin a review.",
          },
          {
            to: "/docs/export",
            title: "Export your decks",
            blurb: "Take the decks you own to another app or keep a copy.",
          },
        ]}
      />
    </div>
  );
}
