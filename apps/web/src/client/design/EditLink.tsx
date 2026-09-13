import { SquarePen } from "lucide-react";
import { useTooltip } from "../components/Tooltip";

const REPO = "https://github.com/krambertech/lymi/edit/main/apps/web/src/client/";

/** Opens the file behind a page or a component on GitHub. */
export function EditLink({ path }: { path: string }) {
  const label = `Edit ${path.split("/").at(-1)} on GitHub`;
  const tip = useTooltip(label);
  return (
    <>
      <a
        ref={(node) => {
          tip.triggerRef.current = node;
        }}
        href={`${REPO}${path}`}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        {...tip.handlers}
        className="relative grid size-8 shrink-0 place-items-center rounded-sm text-muted transition-colors duration-150 before:absolute before:-inset-1.5 before:content-[''] hoverable:hover:bg-hover hoverable:hover:text-text"
      >
        <SquarePen aria-hidden="true" className="size-4" />
      </a>
      {tip.bubble}
    </>
  );
}
