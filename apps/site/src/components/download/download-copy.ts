import { msg } from "@lingui/core/macro";

export const DOWNLOAD_TITLE = msg`Download Lymi for Mac`;
export const DOWNLOAD_DESCRIPTION = msg`Lymi for Mac adds a card from any app with ⌃⌥L and keeps Lymi a click away in the menu bar. For macOS 13 or later.`;
export const DOWNLOAD_HEADING = msg`Lymi for Mac`;
export const DOWNLOAD_SKIP = msg`Skip to the download`;
export const DOWNLOAD_BUTTON = msg`Download for Mac`;
export const DOWNLOAD_REQUIREMENT = msg`macOS 13 or later`;
export const DOWNLOAD_INTEL = msg`Intel Mac?`;
export const DOWNLOAD_INTEL_LABEL = msg`Intel Mac? Download for Intel`;
export const DOWNLOAD_LEDE = msg`Add a card from any app with ⌃⌥L, and keep Lymi a click away in the menu bar.`;
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
