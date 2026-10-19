import { I18nProvider } from "@lingui/react";
import type { ComponentType } from "react";
import type { ChangelogFigureName } from "../../lib/changelog-figures";
import { pageI18n } from "../../lib/i18n";
import { AssistantChat } from "../landing/AssistantChat";
import { EnrichDemo } from "../landing/EnrichDemo";
import { ImportDemo } from "../landing/ImportDemo";
import { JoinLinkDemo } from "../landing/JoinLinkDemo";
import { LibraryDemo } from "../landing/LibraryDemo";
import { ReviewDemo } from "../landing/ReviewDemo";
import { SeriesDemo } from "../landing/SeriesDemo";
import { ActivityFigure } from "./ActivityFigure";
import { CommandMenuFigure } from "./CommandMenuFigure";
import { DeckAiFigure } from "./DeckAiFigure";
import { DeleteAccountFigure } from "./DeleteAccountFigure";
import { FuriganaFigure } from "./FuriganaFigure";
import { HookFigure } from "./HookFigure";
import { ImportantFigure } from "./ImportantFigure";
import { ImportSourcesFigure } from "./ImportSourcesFigure";
import { JapaneseCardFigure } from "./JapaneseCardFigure";
import { RestDaysFigure } from "./RestDaysFigure";
import { ReviewChosenFigure } from "./ReviewChosenFigure";
import { SignInAppleFigure } from "./SignInAppleFigure";
import { SmartAddFigure } from "./SmartAddFigure";
import { TagsFigure } from "./TagsFigure";
import { VoicesFigure } from "./VoicesFigure";
import { WelcomeFigure } from "./WelcomeFigure";

const FIGURES: Record<ChangelogFigureName, ComponentType> = {
  review: ReviewDemo,
  enrich: EnrichDemo,
  import: ImportDemo,
  library: LibraryDemo,
  series: SeriesDemo,
  "join-link": JoinLinkDemo,
  assistant: AssistantChat,
  welcome: WelcomeFigure,
  voices: VoicesFigure,
  activity: ActivityFigure,
  "hook-peek": () => <HookFigure variant="peek" />,
  "hook-write": () => <HookFigure variant="write" />,
  "rest-days": RestDaysFigure,
  "deck-ai": DeckAiFigure,
  important: ImportantFigure,
  tags: TagsFigure,
  "import-sources": ImportSourcesFigure,
  "delete-account": DeleteAccountFigure,
  "smart-add": SmartAddFigure,
  "review-chosen": ReviewChosenFigure,
  furigana: FuriganaFigure,
  "sign-in-apple": SignInAppleFigure,
  "command-menu": CommandMenuFigure,
  "japanese-card": JapaneseCardFigure,
};

interface Props {
  figure: ChangelogFigureName;
  locale: string;
}

/** A landing demo or a drawing shown in an update, in the page's language. */
export default function ChangelogFigure({ figure, locale }: Props) {
  const Figure = FIGURES[figure];
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Figure />
    </I18nProvider>
  );
}
