import { Button } from "../../components/button";
import { LoginView } from "../../views/login-view";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot } from "../shot";

export const screen: Screen = {
  order: 90,
  slug: "sign-in",
  name: "Sign in",
  source: "views/login-view.tsx",
  note: "The front door has one job: sign in. Google stays the first control, and the email form sits under one rule as the other way in; only that form changes when the learner asks to create an account or reset a password. When an MCP client sent the learner here, its verified identity appears inside that same focused panel.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="Sign in" initial="dark" path="/login" bare>
          <LoginView onGoogle={noop} />
        </PhoneShot>
        <PhoneShot caption="Create an account" initial="light" path="/login" bare>
          <LoginView onGoogle={noop} mode="sign-up" />
        </PhoneShot>
        <PhoneShot caption="Reset a password" initial="light" path="/login" bare>
          <LoginView mode="forgot" />
        </PhoneShot>
        <PhoneShot caption="The link is on its way" initial="dark" path="/login" bare>
          <LoginView
            mode="sign-up"
            notice={{
              title: "Check your inbox",
              body: "Check ada@example.com. A message is on the way with the next step.",
              actions: (
                <>
                  <Button size="sm" variant="secondary">
                    Send it again
                  </Button>
                  <Button size="sm" variant="ghost">
                    Back to sign in
                  </Button>
                </>
              ),
            }}
          />
        </PhoneShot>
        <PhoneShot caption="Sent here by an app" initial="light" path="/login" bare>
          <LoginView onGoogle={noop} app={m.claude} />
        </PhoneShot>
        <PhoneShot caption="Sign-in failed" initial="dark" path="/login" bare>
          <LoginView
            onGoogle={noop}
            error="That email and password don’t match. Try again, or reset your password."
          />
        </PhoneShot>
        <PhoneShot caption="A password a guesser opens with" initial="dark" path="/login" bare>
          <LoginView
            onGoogle={noop}
            mode="sign-up"
            email="ada@example.com"
            password="password123"
            passwordError="That password is one of the first an attacker tries. Choose another."
          />
        </PhoneShot>
        <PhoneShot caption="A password worth keeping" initial="light" path="/login" bare>
          <LoginView
            onGoogle={noop}
            mode="sign-up"
            email="ada@example.com"
            password="thunder-oyster-lamp"
          />
        </PhoneShot>
      </div>
    </div>
  ),
};
