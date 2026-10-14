/**
 * A card's picture in a form: one taken or chosen, uploaded once the card exists, or the card's own
 * picture as it stands, `kept`, whose `uri` is on the server.
 */
export type Picture = {
  uri: string;
  name: string;
  type: string;
  description: string;
  kept?: boolean;
};
