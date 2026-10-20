import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { importGuidePath, SOURCE_FILES, SOURCE_NAMES } from "@lymi/client/imports";
import type { ImportFailure, ImportSource } from "@lymi/core";
import { MAX_IMPORT_BYTES } from "@lymi/core";
import { File } from "expo-file-system";
import { openBrowserAsync } from "expo-web-browser";
import { siteUrl } from "../auth/client";
import { i18n } from "../i18n";

export { SOURCE_NAMES };

/** Opens an app's guide in the in-app browser; Quizlet has none yet. */
export function openGuide(source: ImportSource) {
  const path = importGuidePath(source);
  if (path) void openBrowserAsync(siteUrl(path));
}

export const hasGuide = (source: ImportSource) => importGuidePath(source) !== undefined;

/** The apps Lymi imports from, in the order the import page lists them. */
export const SOURCES: { source: ImportSource; detail: MessageDescriptor }[] = [
  { source: "anki", detail: msg`An .apkg or .colpkg file from Anki, AnkiDroid or AnkiMobile` },
  { source: "mochi", detail: msg`A .mochi file from Mochi` },
  { source: "noji", detail: msg`An .ofc file from Noji` },
  { source: "lymi", detail: msg`A Lymi file from another Lymi account` },
  { source: "quizlet", detail: msg`Text you copy from a Quizlet set` },
];

/** A file the learner picked: its bytes are read a part at a time while it uploads. */
export type Picked = { file: File; name: string; size: number };

/** iOS's file picker over every file, since Anki's and Mochi's types are not registered on the phone. */
export async function pickFile(): Promise<Picked | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled) return null;
  return { file: picked.result, name: picked.result.name, size: picked.result.size };
}

/** A picked file as the shared upload reads it: each part's bytes straight from the file. */
export function uploadSource(picked: Picked) {
  return {
    name: picked.name,
    size: picked.size,
    part: (start: number, end: number) => {
      const handle = picked.file.open();
      try {
        handle.offset = start;
        return handle.readBytes(end - start);
      } finally {
        handle.close();
      }
    },
  };
}

/** Why a picked file won't do, checked before anything is sent, with the server's limits. */
export function refusal(source: ImportSource, picked: Picked): string | null {
  const app = SOURCE_NAMES[source];
  if (!SOURCE_FILES[source].test(picked.name)) {
    return source === "mochi"
      ? i18n._(msg`This isn’t a .mochi file. Choose the file you exported from Mochi.`)
      : source === "noji"
        ? i18n._(msg`This isn’t an .ofc file. Choose the file you exported from Noji.`)
        : source === "lymi"
          ? i18n._(msg`This isn’t a .zip file. Choose the file you exported from Lymi.`)
          : source === "quizlet"
            ? i18n._(
                msg`This isn’t a .txt file. Paste the text Quizlet copies, or choose a .txt file.`,
              )
            : i18n._(
                msg`This isn’t an .apkg or .colpkg file. Choose the file you exported from Anki.`,
              );
  }
  if (picked.size > MAX_IMPORT_BYTES) {
    return i18n._(msg`This file is larger than 1 GB. Export one deck at a time.`);
  }
  if (picked.size === 0) return i18n._(msg`This file is empty. Export it again from ${app}.`);
  return null;
}

/** A size a learner reads: 59 KB, 230 MB. Hermes has no unit formatting, so the units are messages. */
export function fileSize(bytes: number): string {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  const gb = mb / 1024;
  const n = (value: number) => i18n.number(value, { maximumFractionDigits: value < 10 ? 1 : 0 });
  if (gb >= 1) return i18n._(msg`${n(gb)} GB`);
  if (mb >= 1) return i18n._(msg`${n(mb)} MB`);
  if (kb >= 1) return i18n._(msg`${n(kb)} KB`);
  return i18n._(msg`${n(bytes)} bytes`);
}

/** What went wrong, and what the learner can do about it. */
export function failureCopy(failure: ImportFailure | null, source: ImportSource) {
  const app = SOURCE_NAMES[source];
  switch (failure) {
    case "unrecognized":
      if (source === "lymi") {
        return {
          title: msg`Couldn’t read this file`,
          body: msg`Choose the .zip file Lymi exports as a Lymi file, without unzipping it.`,
        };
      }
      if (source === "quizlet") {
        return {
          title: msg`Couldn’t read this text`,
          body: msg`Copy the set again from Quizlet with Export, then paste it.`,
        };
      }
      if (source === "noji") {
        return {
          title: msg`Couldn’t read this file`,
          body: msg`Export the deck again from Noji in OFC format, then choose that file.`,
        };
      }
      if (source === "pleco") {
        return {
          title: msg`Couldn’t read this file`,
          body: msg`Export your cards again from Pleco as a text file in UTF-8, then choose that file.`,
        };
      }
      return source === "mochi"
        ? {
            title: msg`Couldn’t read this file`,
            body: msg`Export it again from Mochi as a .mochi file, then choose that file.`,
          }
        : {
            title: msg`Couldn’t read this file`,
            body: msg`Export it again from Anki as an Anki Deck Package (.apkg), then choose that file.`,
          };
    case "damaged":
      return {
        title: msg`This file is damaged`,
        body: msg`Export it again from ${app}, then choose the new file.`,
      };
    case "too_large":
      return {
        title: msg`This file is too large to import at once`,
        body:
          source === "quizlet"
            ? msg`One import takes up to 5,000 cards. Split the set and import it in parts.`
            : source === "mochi"
              ? msg`In Mochi, export one deck at a time instead of everything.`
              : source === "noji"
                ? msg`In Noji, export one sub-deck at a time instead of the whole deck.`
                : source === "pleco"
                  ? msg`In Pleco, export one category at a time, or export again without dictionary definitions.`
                  : source === "lymi"
                    ? msg`Export one deck at a time instead of the whole library.`
                    : msg`Export one deck at a time, or export again without media.`,
      };
    case "upload_incomplete":
      return {
        title: msg`Couldn’t finish the upload`,
        body: msg`Try again on a steadier connection and keep Lymi open until the upload finishes.`,
      };
    case "expired":
      return {
        title: msg`This import expired`,
        body: msg`It wasn’t confirmed within three days, so Lymi deleted the file. Choose it again to start over.`,
      };
    default:
      return {
        title: msg`Couldn’t finish the import`,
        body: msg`Something went wrong on Lymi’s side. Choose the same file again to add the missing cards.`,
      };
  }
}

/** The apps with a start screen of their own on the phone; Pleco imports start on the web for now. */
export type FileSource = Exclude<ImportSource, "quizlet" | "pleco">;

/** How to get the file out of each app, the web's steps ending with saving it to Files. */
export const STEPS: Record<FileSource, MessageDescriptor[]> = {
  anki: [
    msg`In Anki, open the deck’s menu and choose Export. On a computer, choose File, then Export.`,
    msg`Choose Anki Deck Package, and turn on Include Scheduling Information and Include Media.`,
    msg`Save the file to Files, then choose it here.`,
  ],
  mochi: [
    msg`In Mochi, open a deck, open its … menu and choose Export deck.`,
    msg`To export every deck at once, open Settings and choose Export everything instead.`,
    msg`Save the .mochi file to Files, then choose it here.`,
  ],
  noji: [
    msg`In Noji, open a deck you made, open its Settings and choose Export deck. Its sub-decks come too.`,
    msg`Choose OFC and turn on learning progress, then enter your email.`,
    msg`Open Noji’s email on this phone within 24 hours, save the file to Files, then choose it here.`,
  ],
  lymi: [
    msg`In the other account, open a deck’s menu and choose Export deck, or choose Export library in You.`,
    msg`Choose Lymi file, then save it to Files when it’s ready.`,
    msg`Sign back in to this account and choose that file, without unzipping it.`,
  ],
};
