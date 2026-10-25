import { ResourcePage } from "../docs/api/ResourcePage";
import { Doc } from "./Doc";
import { Queries } from "./Queries";

export default function DocsApiResourcePage({ slug }: { slug: string }) {
  return (
    <Queries>
      <Doc path={`/docs/api/${slug}`}>
        <ResourcePage slug={slug} />
      </Doc>
    </Queries>
  );
}
