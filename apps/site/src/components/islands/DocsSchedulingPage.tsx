import type { SchedulingGuide } from "@lymi/core/simulation";
import { Scheduling } from "../docs/pages/Scheduling";
import { Doc } from "./Doc";

export default function DocsSchedulingPage({ guide }: { guide: SchedulingGuide }) {
  return (
    <Doc path="/docs/scheduling">
      <Scheduling guide={guide} />
    </Doc>
  );
}
