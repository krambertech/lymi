import { Trans } from "@lingui/react/macro";
import { Localized } from "../Localized";
import { SignUpSection } from "../landing/SignUpSection";

interface Props {
  locale: string;
  name: string;
  meaningLanguage: string;
  addUrl: string;
}

/** The page's last ask, under the lit lantern: add this deck rather than start an empty account. */
export default function DeckClosing({ locale, name, meaningLanguage, addUrl }: Props) {
  return (
    <Localized locale={locale}>
      <SignUpSection
        title={
          <Trans>
            Start learning <span lang={meaningLanguage}>{name}</span>
          </Trans>
        }
        action={{ href: addUrl, label: <Trans>Add free deck</Trans>, place: "closing" }}
      />
    </Localized>
  );
}
