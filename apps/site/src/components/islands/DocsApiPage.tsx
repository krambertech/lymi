import { ApiOverview } from "../docs/api/ApiOverview";
import { Doc } from "./Doc";
import { Queries } from "./Queries";

export default function DocsApiPage() {
  return (
    <Queries>
      <Doc path="/docs/api">
        <ApiOverview />
      </Doc>
    </Queries>
  );
}
