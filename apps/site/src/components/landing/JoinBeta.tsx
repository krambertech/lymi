import type { BetaSource } from "../../lib/api";
import { BetaSignup } from "../BetaSignup";

/**
 * The page's one conversion. Joining captures interest and nothing else: no account is
 * created and no access is granted, which the form says out loud so nobody waits for a
 * password that is never coming.
 *
 * On the landing page the field and action sit together on wide screens; the dedicated
 * invitation page gives the same form a roomier stacked layout.
 */
export function JoinBeta({ source = "landing" }: { source?: BetaSource | undefined }) {
  return (
    <div className="w-full max-w-[480px]">
      <BetaSignup source={source} />
    </div>
  );
}
