/** What the last add did, said under the fields until the next one. */
export type Outcome =
  | {
      kind: "added";
      id: string;
      term: string;
      deckName: string;
      queued: boolean;
      /** Why the card went in without its picture. */
      pictureError?: string | undefined;
      /** The picture that did not reach the card, held for Try again. */
      picture?: Picture | undefined;
    }
  | { kind: "skipped"; term: string; deckName: string };

export const UNDO_FOR = 5000;

/** A picture chosen for the card, uploaded once the card exists. */
export type Picture = { uri: string; name: string; type: string; description: string };
