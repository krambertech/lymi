import { Link } from "@tanstack/react-router";
import { Archive, MoreHorizontal, Plus, Search, Volume2, X } from "lucide-react";
import { AddMenu } from "../../components/add-menu";
import { Button, IconButton } from "../../components/button";
import { Rule } from "../do-dont";
import { Variants } from "../frame";
import { type Group, noop } from "./types";

export const actions: Group = {
  slug: "actions",
  title: "Actions",
  lede: "Standard controls that look like what they are. One primary per view. Buttons press down 3%; nothing lifts.",
  entries: [
    {
      slug: "button",
      name: "Button",
      source: "components/button.tsx",
      note: "Medium is the default size. A kbd hint shows on desktop only.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Primary",
              note: "The one thing to press. Amber, and once per view.",
              render: () => (
                <Button variant="primary" kbd="R">
                  Review 11 due
                </Button>
              ),
            },
            {
              label: "Secondary",
              note: "Every other action. A plate with an edge.",
              render: () => <Button kbd="N">Add card</Button>,
            },
            {
              label: "Ghost",
              note: "A way out, like Cancel. No plate until hovered.",
              render: () => <Button variant="ghost">Cancel</Button>,
            },
            {
              label: "Danger",
              note: "Archive and delete. Soft until hovered, and it carries an icon.",
              render: () => (
                <Button variant="danger">
                  <Archive data-icon="inline-start" aria-hidden="true" />
                  Archive deck
                </Button>
              ),
            },
            {
              label: "Extra large",
              note: "Today's one full-width action, Review. Nowhere else.",
              render: () => (
                <Button variant="primary" size="xl" className="w-full">
                  Review
                </Button>
              ),
            },
            {
              label: "Large",
              note: "The end of a flow, where the button is the whole answer.",
              render: () => (
                <Button variant="primary" size="lg">
                  Done
                </Button>
              ),
            },
            {
              label: "Small",
              note: "Inside rows, headers and specimens.",
              render: () => <Button size="sm">Rename</Button>,
            },
            {
              label: "Loading",
              note: "Keeps its width while the request runs, and swallows a second press.",
              render: () => (
                <Button variant="primary" loading>
                  Adding
                </Button>
              ),
            },
            {
              label: "Unavailable",
              note: "Mid-request, or with no handler: aria-disabled keeps it focusable and swallows the press. A form’s submit stays pressable and says what’s missing.",
              render: () => <Button aria-disabled>Saving</Button>,
            },
            {
              label: "Link",
              note: "A link that looks like a button passes itself as `render` and keeps the button's inside.",
              render: () => (
                <Button render={<Link to="/library" onClick={(e) => e.preventDefault()} />}>
                  Open Library
                </Button>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "icon-button",
      name: "Icon button",
      source: "components/button.tsx",
      note: "Lucide at its 2 px stroke. The label is required: an icon alone says nothing to a screen reader.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Secondary, round",
              note: "A standing control on a card, like pronunciation.",
              render: () => (
                <IconButton label="Play pronunciation" variant="secondary" round>
                  <Volume2 />
                </IconButton>
              ),
            },
            {
              label: "Ghost, medium",
              note: "The default. Bar actions such as search and options.",
              render: () => (
                <>
                  <IconButton label="Search">
                    <Search />
                  </IconButton>
                  <IconButton label="Deck options">
                    <MoreHorizontal />
                  </IconButton>
                </>
              ),
            },
            {
              label: "Ghost, small",
              note: "Row actions and close, where a 40 px button would crowd the row.",
              render: () => (
                <>
                  <IconButton label="Deck options" size="sm">
                    <MoreHorizontal />
                  </IconButton>
                  <IconButton label="Leave review" size="sm">
                    <X />
                  </IconButton>
                </>
              ),
            },
            {
              label: "Sizes",
              note: "xs 24, sm 32, md 40, lg 48. xs dismisses a card without pushing its content down.",
              render: () => (
                <>
                  {(["xs", "sm", "md", "lg"] as const).map((size) => (
                    <IconButton key={size} label={`Close, ${size}`} size={size}>
                      <X />
                    </IconButton>
                  ))}
                </>
              ),
            },
            {
              label: "Primary and danger",
              note: "Primary for the page’s one action when it has no words; danger for a destructive one.",
              render: () => (
                <>
                  <IconButton label="Add a card" variant="primary">
                    <Plus />
                  </IconButton>
                  <IconButton label="Archive card" variant="danger">
                    <Archive />
                  </IconButton>
                </>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "capture",
      name: "Capture",
      source: "components/add-menu.tsx",
      note: "One plus for both things a learner adds, a card or a deck. Round and amber, because it is the app’s standing action rather than the page’s. N opens it from anywhere.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Medium",
              note: "In every page header on the phone.",
              render: () => <AddMenu onAddCard={noop} onCreateDeck={noop} />,
            },
            {
              label: "Small",
              note: "In the rail, beside the mark.",
              render: () => <AddMenu onAddCard={noop} onCreateDeck={noop} size="sm" />,
            },
          ]}
        />
      ),
    },
  ],
  Rules: ActionRules,
};

function ActionRules() {
  return (
    <>
      <Rule
        kind="do"
        title="Keep the button active and show errors on submit."
        note="The form checks itself and moves to the first error."
      >
        <Button variant="primary">Create deck</Button>
      </Rule>
      <Rule
        kind="dont"
        title="Disable the button until the form is ready."
        note="A grey button can’t tell people what’s missing."
      >
        <Button variant="primary" disabled>
          Create deck
        </Button>
      </Rule>
      <Rule kind="do" title="Say what each button does.">
        <Button variant="ghost">Keep key</Button>
        <Button variant="danger">Revoke key</Button>
      </Rule>
      <Rule kind="dont" title="Use OK and Cancel.">
        <Button>Cancel</Button>
        <Button variant="primary">OK</Button>
      </Rule>
      <Rule kind="do" title="Pick one of the button sizes.">
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </Rule>
      <Rule
        kind="dont"
        title="Resize a button with className."
        note="If no size fits, ask for a new one."
      >
        <Button className="h-14 rounded-full px-9 text-lg">Custom</Button>
      </Rule>
    </>
  );
}
