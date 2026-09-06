import { ApiReference } from "../docs/pages/ApiReference";
import { Doc } from "./Doc";
import { Queries } from "./Queries";

export default function DocsApiPage() {
  return (
    <Queries>
      <Doc path="/docs/api">
        <ApiReference />
      </Doc>
    </Queries>
  );
}
