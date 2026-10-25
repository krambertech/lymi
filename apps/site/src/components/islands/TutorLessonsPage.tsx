import { TutorLessonsView } from "../landing/TutorLessonsView";
import { Island } from "./Island";

interface Props {
  locale?: string | undefined;
}

export default function TutorLessonsPage({ locale }: Props) {
  return (
    <Island locale={locale}>
      <TutorLessonsView />
    </Island>
  );
}
