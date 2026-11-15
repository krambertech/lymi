export const title = "Signing in on the web";

const form = { "sign-in": "Sign in", "sign-up": "Create account", forgot: "Reset password" };
const busy = {
  "sign-in": "Signing in",
  "sign-up": "Creating the account",
  forgot: "Sending the reset link",
};

export const state = (v) => {
  if (v.status === "in") return "Signed in";
  if (v.status === "submitting") return busy[v.mode];
  if (v.status === "sent")
    return v.mode === "forgot"
      ? "Check your inbox for the reset link"
      : "Check your inbox to confirm";
  if (v.status === "resending") return "Sending the link again";
  return form[v.mode];
};

export const group = (v) =>
  v.status === "in" ? "in" : v.status === "sent" || v.status === "resending" ? "inbox" : v.mode;
export const colors = {
  "sign-in": "blue",
  "sign-up": "purple",
  forgot: "tan",
  inbox: "teal",
  in: "yellow",
};

const steps = {
  YouSwitch: (_from, to) =>
    to.mode === "sign-up"
      ? "you press Create an account"
      : to.mode === "forgot"
        ? "you press Forgot your password?"
        : "you press Back to sign in",
  YouSubmit: () => "you press the form's button",
  Refused: () => "Lymi says no",
  LinkSent: () => "a link is on its way",
  SignedIn: () => "the password is right",
  YouSendAgain: () => "you press Send it again",
  Resent: () => "it is sent again",
  ResendFails: () => "sending again fails",
};
// Hidden: a sign-in that lands after a switch to another form or a new submit there (the page
// still moves on), Back
// while a link is sent again, and a resend that fails. Each is the whole of its arrow.
const hidden = (action, from) =>
  (action === "SignedIn" && !(from.status === "submitting" && from.mode === "sign-in")) ||
  (action === "YouSwitch" && from.status === "resending") ||
  action === "ResendFails";
export const step = (action, from, to) =>
  hidden(action, from) ? null : action in steps ? steps[action](from, to) : action;
