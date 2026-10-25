import { NotesToFlashcardsView } from "../landing/NotesToFlashcardsView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function NotesToFlashcardsPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <NotesToFlashcardsView />
    </Island>
  );
}
