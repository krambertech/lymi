import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { Locale } from "../../lib/routes";
import { EstonianView } from "../landing/EstonianView";
import { Island } from "./Island";

interface Props {
  locale: Locale;
  /** The published Estonian decks, read per request. */
  decks: PublicDeckSummary[];
}

export default function EstonianPage({ locale, decks }: Props) {
  return (
    <Island locale={locale}>
      <EstonianView decks={decks} locale={locale} />
    </Island>
  );
}
