import type { Section } from "./api";

export type SectionActionId =
  | "start_section"
  | "review"
  | "add_card"
  | "rename_section"
  | "reorder_sections";

/**
 * What can be done to a section, in groups and in order. Every place that offers a section's
 * actions draws this list, so a heading's ⋯, its long press and a section page never disagree.
 */
export function sectionActions(
  section: Pick<Section, "status" | "due">,
  { owner, several }: { owner: boolean; several: boolean },
): SectionActionId[][] {
  const learn: SectionActionId[] = [];
  if (section.status === "locked") learn.push("start_section");
  // A card started early in a section that is not open is still in review, so it counts here too.
  if (section.due > 0) learn.push("review");
  const tend: SectionActionId[] = owner
    ? ["add_card", "rename_section", ...(several ? ["reorder_sections" as const] : [])]
    : [];
  return [learn, tend].filter((group) => group.length > 0);
}
