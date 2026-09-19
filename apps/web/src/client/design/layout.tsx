import { clsx } from "clsx";
import { ArrowLeft, ArrowUp, ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { Table, Td, Th } from "../components/table";
import { DocLink } from "./doc-link";
import { Doc, Specimen, Sub } from "./frame";

/** A phone in outline, small enough to compare four side by side. */
function Mini({
  caption,
  children,
  className,
}: {
  caption: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <figure className="grid w-36 gap-2">
      <div
        className={clsx(
          "edge-2 relative flex h-56 flex-col overflow-hidden rounded-xl bg-canvas",
          className,
        )}
        aria-hidden="true"
      >
        {children}
      </div>
      <figcaption className="text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

function Bar({ start, end }: { start: ReactNode; end?: ReactNode | undefined }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 px-2.5 text-2xs text-text-2 [&_svg]:size-3">
      {start}
      <span className="ms-auto flex items-center gap-1">{end}</span>
    </div>
  );
}

const Dot = ({ amber }: { amber?: boolean }) => (
  <i className={clsx("block size-3 rounded-full", amber ? "bg-amber" : "bg-plate-2 edge")} />
);
const Square = () => <i className="edge block size-3 rounded-[3px] bg-plate-2" />;

function Body({ title }: { title: string }) {
  return (
    <div className="grid gap-1.5 px-2.5">
      <span className="text-sm font-medium text-text">{title}</span>
      <i className="edge block h-8 rounded-sm bg-plate" />
      <i className="edge block h-5 rounded-sm bg-plate" />
      <i className="edge block h-5 rounded-sm bg-plate" />
    </div>
  );
}

const Pill = () => (
  <i className="edge absolute inset-x-0 bottom-2 mx-auto block h-4 w-16 rounded-full bg-plate-2" />
);

const Back = ({ to }: { to: string }) => (
  <span className="flex items-center">
    <ChevronLeft className="rtl:-scale-x-100" />
    {to}
  </span>
);

export function Layout() {
  return (
    <Doc
      title="Layout"
      lede="Every surface is a tab, a page, a place or a moment. The kind sets its bar, how it arrives and how you leave it. Screen and PlaceBar build the bar, so a view never does."
    >
      <Sub
        title="Four kinds of surface"
        note="A tab is a row in the rail: Today, Library, Insights and Explore. The phone’s pill holds the first two, and the avatar menu opens the rest. A page is a screen you reach from a tab, or from the avatar menu. A place is a page that opens over the screen you were on, such as a word or the streak. A moment is a form or a question the learner asked for. Review is outside the four. It hides the rail and the pill, and Leave review is its one way out."
      >
        <Specimen className="items-start gap-6">
          <Mini caption="Tab: lockup, then streak, capture, avatar">
            <Bar
              start={<i className="block size-4 rounded-[4px] bg-text" />}
              end={
                <>
                  <Square />
                  <Dot amber />
                  <Dot />
                </>
              }
            />
            <Body title="Today" />
            <Pill />
          </Mini>
          <Mini caption="Page: back, then its own controls">
            <Bar
              start={<Back to="Library" />}
              end={
                <>
                  <Square />
                  <Dot amber />
                  <Square />
                </>
              }
            />
            <Body title="Lesson 14" />
            <Pill />
          </Mini>
          <Mini caption="Place: opens over the page and covers the pill">
            <Bar start={<Back to="Lesson 14" />} end={<Square />} />
            <Body title="sbrigarsi" />
          </Mini>
          <Mini caption="Moment: a drawer with its own actions and no bar">
            <div className="flex-1 bg-scrim" />
            <div className="edge-2 grid gap-1.5 rounded-t-lg bg-plate px-2.5 pt-1.5 pb-3">
              <i className="mx-auto block h-0.5 w-6 rounded-full bg-edge-2" />
              <span className="text-xs font-medium text-text">New deck</span>
              <i className="edge block h-5 rounded-sm bg-canvas" />
              <i className="block h-5 rounded-sm bg-amber" />
            </div>
          </Mini>
        </Specimen>
      </Sub>

      <Sub
        title="One bar"
        note="56 px tall on every screen. The start holds the way back, or the lockup on a tab, which has nowhere to go back to. The end holds the screen’s controls. The title sits under the bar, on the same line on every screen. A screen without a bar is a bug."
      >
        <Specimen layout="block">
          <div className="mx-auto grid max-w-sm gap-1">
            <div className="flex h-14 items-center gap-2 text-sm text-text-2">
              <span className="edge flex h-11 items-center gap-0.5 rounded-sm bg-plate-2 ps-1 pe-2.5 [&_svg]:size-5">
                <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
                way back
              </span>
              <span className="edge ms-auto flex h-10 items-center rounded-sm bg-plate-2 px-2.5">
                controls
              </span>
            </div>
            <span className="text-2xl font-medium text-text">Title</span>
            <span className="text-sm text-muted">One line under it: a count, a date</span>
          </div>
        </Specimen>
      </Sub>

      <Sub
        title="Back names a place"
        note="Back is a 44 px target labelled with the screen it returns to, so a word’s back names its deck. It goes to that screen’s parent and ignores browser history, so it lands in the same place every time. A view inside a place, such as the daily goal in the streak, uses the same slot and names the view above it. A long name truncates before it reaches the controls."
      />

      <Sub
        title="On a phone, motion says how you leave"
        note="A surface that fills the screen arrives from the end edge. It leaves by back, or by a swipe from that edge. A surface that arrives from below is a drawer. It never fills the screen and has no back or close. A swipe down or one of its actions dismisses it. The phone has no X anywhere."
      >
        <Specimen className="items-start gap-6">
          <Mini caption="From the side: back">
            <Bar start={<Back to="Lesson 14" />} />
            <Body title="sbrigarsi" />
            <ArrowLeft
              className="absolute end-2 top-1/2 size-5 text-amber-ink rtl:-scale-x-100"
              aria-hidden="true"
            />
          </Mini>
          <Mini caption="From below: swipe down, or its actions">
            <div className="flex-1 bg-scrim" />
            <div className="edge-2 relative grid gap-1.5 rounded-t-lg bg-plate px-2.5 pt-1.5 pb-3">
              <i className="mx-auto block h-0.5 w-6 rounded-full bg-edge-2" />
              <span className="text-xs font-medium text-text">Move card</span>
              <i className="edge block h-5 rounded-sm bg-canvas" />
              <i className="block h-5 rounded-sm bg-amber" />
              <ArrowUp className="absolute end-2 top-1.5 size-4 text-text-2" aria-hidden="true" />
            </div>
          </Mini>
        </Specimen>
      </Sub>

      <Sub
        title="The machine picks the shape"
        note="A view declares the kind and the layout picks the shape. It reads the device as the overlay opens and holds that shape until it closes. The rule is width plus pointer, so a tablet held in two hands gets the phone’s shapes. On a desktop a place closes with an X at the end of its first row."
      >
        <Table>
          <thead>
            <tr>
              <Th>Kind</Th>
              <Th>Phone</Th>
              <Th>Desktop</Th>
              <Th>Leaves by</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Tab</Td>
              <Td>Bar with the lockup, pill below</Td>
              <Td>No bar; the rail</Td>
              <Td>The pill or the rail</Td>
            </tr>
            <tr>
              <Td>Page</Td>
              <Td>Bar with back</Td>
              <Td>No bar, unless its parent is not a row in the rail</Td>
              <Td>Back, the rail</Td>
            </tr>
            <tr>
              <Td>Place</Td>
              <Td>The whole screen, from the end edge</Td>
              <Td>A side sheet, a centred dialog, or a panel beside its list when both fit</Td>
              <Td>
                Back on a phone; <X className="inline size-3.5" aria-label="close" />, Escape or the
                scrim on a desktop
              </Td>
            </tr>
            <tr>
              <Td>Moment</Td>
              <Td>A drawer from the bottom</Td>
              <Td>A centred dialog</Td>
              <Td>Its own actions, a swipe down, Escape</Td>
            </tr>
          </tbody>
        </Table>
      </Sub>

      <Sub
        title="A place is a URL"
        note="A place looks like a page, so the system back gesture must close it, and a reload or a shared link must reopen it. Its open state lives in the address: ?streak on any screen, ?card on a deck. A moment has no address, so a reload never reopens a form."
      />

      <Sub
        title="Controls are written once"
        note="A screen passes its controls once. The layout puts them in the bar on a phone and beside the title on a desktop. Status leads, then square ghost buttons at 40 px. The round amber capture goes first among the buttons, so it never sits between two squares. One primary per screen. A control that needs the whole bar, such as search, replaces the bar at the same height and gives it back on Cancel, so the title stays put."
      />

      <Sub
        title="Where the rest lives"
        note={
          <>
            Column widths, the rail and the breakpoints are under{" "}
            <DocLink to={{ kind: "page", page: "space" }} className="underline underline-offset-2">
              Space and shape
            </DocLink>
            . The parts are under{" "}
            <DocLink
              to={{ kind: "group", group: "layout" }}
              className="underline underline-offset-2"
            >
              Screens and places
            </DocLink>{" "}
            in Components, where each shape opens for real. Drawers and dialogs are under{" "}
            <DocLink
              to={{ kind: "group", group: "overlays" }}
              className="underline underline-offset-2"
            >
              Overlays
            </DocLink>
            .
          </>
        }
      />
    </Doc>
  );
}
