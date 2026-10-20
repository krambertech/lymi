import type { LanguageOut } from "@lymi/core";
import { Languages } from "../docs/pages/Languages";
import { Doc } from "./Doc";

export default function DocsLanguagesPage({ languages }: { languages: readonly LanguageOut[] }) {
  return (
    <Doc path="/docs/languages">
      <Languages languages={languages} />
    </Doc>
  );
}
