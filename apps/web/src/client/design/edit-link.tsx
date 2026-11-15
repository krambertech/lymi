import { ArrowUpRight } from "lucide-react";

export const REPO = "https://github.com/krambertech/lymi/blob/main/";

function RepoLink({
  href,
  label,
  file,
}: {
  href: string;
  label?: string | undefined;
  file: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-150 hoverable:hover:text-ink"
    >
      {label && <span>{label}</span>}
      <code className="font-mono text-[0.9em] text-ink-secondary underline decoration-edge underline-offset-4 transition-colors duration-150 hoverable:group-hover:text-ink hoverable:group-hover:decoration-current">
        {file}
      </code>
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </a>
  );
}

/** The file behind a page or a component, on GitHub. */
export function EditLink({ path, label }: { path: string; label?: string | undefined }) {
  return (
    <RepoLink
      href={`${REPO}apps/web/src/client/${path}`}
      label={label}
      file={path.split("/").at(-1) ?? path}
    />
  );
}

/** The written guide that owns a page's rules, their reasons and exceptions. */
export function GuideLink({ path }: { path: string }) {
  return (
    <RepoLink
      href={`${REPO}docs/design/system/${path}`}
      label="Rules"
      file={path.split("/").at(-1) ?? path}
    />
  );
}
