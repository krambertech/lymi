import { Archive, MoreHorizontal, Volume2, X } from "lucide-react";
import { AddMenu } from "../../components/add-menu";
import { Button, IconButton } from "../../components/button";
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
              label: "Disabled",
              note: "Only when pressing could do nothing at all. A form’s submit stays pressable and says what is missing.",
              render: () => <Button disabled>Disabled</Button>,
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
              label: "Ghost, small",
              note: "Row and header actions: options, close. The default.",
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
};
