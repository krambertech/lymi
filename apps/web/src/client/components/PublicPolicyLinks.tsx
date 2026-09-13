import { Trans } from "@lingui/react/macro";
import { publicSiteUrl } from "../lib/origins";

/** Public help and policy links stay reachable before sign-in and from authorization screens. */
export function PublicPolicyLinks({ className = "" }: { className?: string }) {
  const linkClass =
    "rounded-xs underline decoration-edge-2 underline-offset-2 hoverable:hover:text-text hoverable:hover:decoration-current";
  return (
    <nav
      aria-label="Lymi policies and support"
      className={`flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted ${className}`}
    >
      <a href={publicSiteUrl("/privacy")} className={linkClass}>
        <Trans>Privacy</Trans>
      </a>
      <a href={publicSiteUrl("/terms")} className={linkClass}>
        <Trans>Terms</Trans>
      </a>
      <a href={publicSiteUrl("/support")} className={linkClass}>
        <Trans>Support</Trans>
      </a>
    </nav>
  );
}
