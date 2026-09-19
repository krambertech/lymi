import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, type PasswordProblem } from "@lymi/core";

/** What each refusal says, so the box and the route never disagree about why. */
export function passwordMessage(problem: PasswordProblem): MessageDescriptor {
  switch (problem) {
    case "too-short":
      return msg`Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "too-long":
      return msg`Use at most ${MAX_PASSWORD_LENGTH} characters.`;
    case "too-common":
      return msg`That password is too easy to guess. Try another.`;
    case "from-address":
      return msg`Don’t use your email address in your password.`;
    case "from-lymi":
      return msg`Don’t use “Lymi” in your password.`;
  }
}
