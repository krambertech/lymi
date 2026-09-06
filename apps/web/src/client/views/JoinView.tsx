import { AuthFrame } from "../components/AuthFrame";
import { BetaSignup } from "../components/BetaSignup";
import { productUrl } from "../lib/origins";

/** The invitation request is its own small sign-up flow, separate from authentication. */
export function JoinView() {
  return (
    <AuthFrame>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 @xl:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-text">
            Request an invitation
          </h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-md text-text-2">
            Lymi is private for now. Leave your email and we’ll send an invitation when there’s
            room.
          </p>
        </div>

        <div className="mt-7">
          <BetaSignup source="join" compact layout="stacked" />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already invited?{" "}
          <a
            href={productUrl("/login")}
            className="rounded-sm font-medium text-text underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:decoration-current"
          >
            Sign in
          </a>
        </p>
      </section>
    </AuthFrame>
  );
}
