import { msg } from "@lingui/core/macro";

export const DOWNLOAD_TITLE = msg`Download Lymi for iPhone, Android and Mac`;
export const DOWNLOAD_DESCRIPTION = msg`Get Lymi for iPhone, Android and Mac. Your decks and progress are the same on every device.`;
export const DOWNLOAD_HEADING = msg`Get Lymi`;
export const DOWNLOAD_LEDE = msg`Review and add cards on your phone and your Mac. Your decks and progress are the same everywhere.`;
export const DOWNLOAD_MAC_HEADING = msg`Lymi for Mac`;
export const DOWNLOAD_SKIP = msg`Skip to the downloads`;
export const DOWNLOAD_BUTTON = msg`Download for Mac`;
export const DOWNLOAD_REQUIREMENT = msg`macOS 13 or later`;
export const DOWNLOAD_INTEL = msg`Intel Mac?`;
export const DOWNLOAD_INTEL_LABEL = msg`Intel Mac? Download for Intel`;
export const DOWNLOAD_MAC_LEDE = msg`Add a card from any app with ⌃⌥L, and open Lymi from the menu bar.`;
export const DOWNLOAD_STEPS_HEADING = msg`How to install`;
export const DOWNLOAD_STEPS = [
  { title: msg`Open Lymi.dmg`, body: msg`It’s in your Downloads folder.` },
  {
    title: msg`Drag Lymi to Applications`,
    body: msg`Then open it. macOS asks once whether to open an app from the internet. Choose Open.`,
  },
  {
    title: msg({ message: "Sign in", context: "download step" }),
    body: msg`Then press ⌃⌥L in any app to add a card.`,
  },
];
