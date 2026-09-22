import { ResetPasswordView } from "../../views/reset-password-view";
import type { Screen } from "../parts/types";
import { PhoneShot } from "../shot";

export const screen: Screen = {
  order: 120,
  slug: "set-a-password",
  name: "Set a password",
  source: "views/reset-password-view.tsx",
  note: "The second half of a reset, opened from the email. It is the login panel with one field, so the learner never leaves the door they started at. A spent link says so and offers a new one rather than a dead form.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="Set a new password" initial="dark" path="/reset-password" bare>
          <ResetPasswordView />
        </PhoneShot>
        <PhoneShot caption="Too short" initial="light" path="/reset-password" bare>
          <ResetPasswordView password="short" passwordError="Use at least 8 characters." />
        </PhoneShot>
        <PhoneShot caption="The link is spent" initial="light" path="/reset-password" bare>
          <ResetPasswordView expired />
        </PhoneShot>
        <PhoneShot caption="Saved" initial="dark" path="/reset-password" bare>
          <ResetPasswordView done />
        </PhoneShot>
      </div>
    </div>
  ),
};
