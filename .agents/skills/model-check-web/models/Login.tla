---- MODULE Login ----
\* The email form on /login: switching forms, submitting, the answer, and the check-inbox notice.
\* apps/web/src/client/routes/login.tsx and apps/web/src/client/lib/login-flow.ts.
EXTENDS Naturals

CONSTANTS
  MaxAttempts,    \* how many submits in one run
  ChecksAttempt   \* an answer lands only while its attempt is the one submitting

Modes == {"sign-in", "sign-up", "forgot"}

VARIABLES
  mode,        \* which form shows
  status,      \* "form", "submitting", "sent", "resending" or "in"
  attempt,     \* the current submit's number
  requests,    \* submits in flight: [a |-> attempt, m |-> the form that sent it]
  errorsFrom,  \* the form whose answer the errors came from, or "none"
  noticeFrom   \* the form whose answer the notice came from, or "none"

vars == <<mode, status, attempt, requests, errorsFrom, noticeFrom>>

Init ==
  /\ mode = "sign-in" /\ status = "form" /\ attempt = 0 /\ requests = {}
  /\ errorsFrom = "none" /\ noticeFrom = "none"

\* The links under the form and Back to sign in on the notice; open during a submit too.
YouSwitch ==
  /\ status # "in"
  /\ IF status \in {"sent", "resending"}
       THEN mode' = "sign-in"    \* the notice replaces the form; it offers only this link
       ELSE \/ mode = "sign-in" /\ mode' \in {"sign-up", "forgot"}
            \/ mode # "sign-in" /\ mode' = "sign-in"
  /\ status' = "form" /\ errorsFrom' = "none" /\ noticeFrom' = "none"
  /\ UNCHANGED <<attempt, requests>>

YouSubmit ==
  /\ status = "form" /\ attempt < MaxAttempts
  /\ attempt' = attempt + 1 /\ status' = "submitting"
  /\ requests' = requests \cup {[a |-> attempt + 1, m |-> mode]}
  /\ errorsFrom' = "none"
  /\ UNCHANGED <<mode, noticeFrom>>

Lands(r) == ~ChecksAttempt \/ (status = "submitting" /\ attempt = r.a)

\* A refusal: wrong password, a taken or bad address, a weak password, no connection.
Refused ==
  \E r \in requests :
    /\ requests' = requests \ {r}
    /\ IF Lands(r) THEN status' = "form" /\ errorsFrom' = r.m ELSE UNCHANGED <<status, errorsFrom>>
    /\ UNCHANGED <<mode, attempt, noticeFrom>>

\* A link is on its way: a new account, a reset, or a sign-in whose address is unconfirmed.
LinkSent ==
  \E r \in requests :
    /\ requests' = requests \ {r}
    /\ IF Lands(r) THEN status' = "sent" /\ noticeFrom' = r.m ELSE UNCHANGED <<status, noticeFrom>>
    /\ UNCHANGED <<mode, attempt, errorsFrom>>

\* The right password: the page moves on, whatever form shows.
SignedIn ==
  \E r \in requests :
    /\ r.m = "sign-in"
    /\ requests' = {} /\ status' = "in"
    /\ UNCHANGED <<mode, attempt, errorsFrom, noticeFrom>>

YouSendAgain ==
  /\ status = "sent" /\ noticeFrom \in {"sign-in", "sign-up"}
  /\ status' = "resending"
  /\ UNCHANGED <<mode, attempt, requests, errorsFrom, noticeFrom>>

Resent ==
  /\ status = "resending"
  /\ status' = "sent"
  /\ UNCHANGED <<mode, attempt, requests, errorsFrom, noticeFrom>>

ResendFails ==
  /\ status = "resending"
  /\ status' = "form" /\ errorsFrom' = mode /\ noticeFrom' = "none"
  /\ UNCHANGED <<mode, attempt, requests>>

Next ==
  YouSwitch \/ YouSubmit \/ Refused \/ LinkSent \/ SignedIn \/ YouSendAgain \/ Resent
    \/ ResendFails

Spec == Init /\ [][Next]_vars

\* A form shows only its own answer: errors and notices never come from the other form.
AnswerOnItsForm ==
  /\ errorsFrom \in {"none", mode}
  /\ noticeFrom \in {"none", mode}
====
