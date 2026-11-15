---- MODULE SmartAdd ----
\* Smart add's steps against the late answers of a read: the 700 ms beat after the scan and the
\* check of the learner's own answers. apps/web/src/client/components/smart-add.tsx and
\* apps/web/src/client/lib/smart-add-flow.ts; see the skill for which step is which code.
EXTENDS Naturals

CONSTANTS
  MaxReads,        \* how many times the learner presses Find terms in one run
  ChecksAttempt    \* "advance" and "checked" land only for the current read on its own step

VARIABLES
  step,      \* "input", "reading", "questions", "list" or "added"
  attempt,   \* the current read's number (attempts.current)
  finished,  \* the current read's scan has finished
  asked,     \* the current read came back with questions
  beats,     \* reads whose 700 ms beat timer is still pending
  checks,    \* reads whose own-answer check is in flight
  left       \* reads the learner left with Stop or Back

vars == <<step, attempt, finished, asked, beats, checks, left>>

Init ==
  /\ step = "input" /\ attempt = 0 /\ finished = FALSE /\ asked = FALSE
  /\ beats = {} /\ checks = {} /\ left = {}

YouFindTerms ==
  /\ step = "input" /\ attempt < MaxReads
  /\ step' = "reading" /\ attempt' = attempt + 1 /\ finished' = FALSE /\ asked' = FALSE
  /\ UNCHANGED <<beats, checks, left>>

\* readLesson resolves: dispatch finish, then the beat's setTimeout starts.
ScanFinishes ==
  /\ step = "reading" /\ ~finished
  /\ finished' = TRUE /\ asked' \in BOOLEAN /\ beats' = beats \cup {attempt}
  /\ UNCHANGED <<step, attempt, checks, left>>

ReadFails ==
  /\ step = "reading" /\ ~finished
  /\ step' = "input"
  /\ UNCHANGED <<attempt, finished, asked, beats, checks, left>>

YouStop ==
  /\ step = "reading"
  /\ step' = "input" /\ left' = left \cup {attempt}
  /\ UNCHANGED <<attempt, finished, asked, beats, checks>>

\* The beat's timer fires: dispatch advance for the read that started it.
BeatEnds ==
  \E a \in beats :
    /\ beats' = beats \ {a}
    /\ IF ~ChecksAttempt \/ (step = "reading" /\ attempt = a /\ finished)
         THEN step' = IF asked THEN "questions" ELSE "list"
         ELSE UNCHANGED step
    /\ UNCHANGED <<attempt, finished, asked, checks, left>>

\* Show terms: applyOwnAnswers starts. The button is busy, so one check per read at a time.
YouShowTerms ==
  /\ step = "questions" /\ attempt \notin checks
  /\ checks' = checks \cup {attempt}
  /\ UNCHANGED <<step, attempt, finished, asked, beats, left>>

CheckAnswers ==
  \E a \in checks :
    /\ checks' = checks \ {a}
    /\ IF ~ChecksAttempt \/ (step = "questions" /\ attempt = a)
         THEN step' = "list"
         ELSE UNCHANGED step
    /\ UNCHANGED <<attempt, finished, asked, beats, left>>

CheckFails ==
  \E a \in checks :
    /\ checks' = checks \ {a}
    /\ UNCHANGED <<step, attempt, finished, asked, beats, left>>

YouGoBack ==
  \/ /\ step = "questions"
     /\ step' = "input" /\ left' = left \cup {attempt}
     /\ UNCHANGED <<attempt, finished, asked, beats, checks>>
  \/ /\ step = "list"
     /\ step' = IF asked THEN "questions" ELSE "input"
     /\ left' = IF asked THEN left ELSE left \cup {attempt}
     /\ UNCHANGED <<attempt, finished, asked, beats, checks>>

YouAddCards ==
  /\ step = "list"
  /\ step' = "added"
  /\ UNCHANGED <<attempt, finished, asked, beats, checks, left>>

Next ==
  YouFindTerms \/ ScanFinishes \/ ReadFails \/ YouStop \/ BeatEnds \/ YouShowTerms
    \/ CheckAnswers \/ CheckFails \/ YouGoBack \/ YouAddCards

Spec == Init /\ [][Next]_vars

\* A read the learner stopped or went back from never moves the step to its questions or list.
NoMoveAfterLeaving == step \in {"questions", "list"} => attempt \notin left
====
