---- MODULE ReviewDay ----
\* Today's review_days row on the server, apps/web/src/server/services/review-days.ts and the
\* grade in review.ts, with the rules in packages/core/src/streak.ts.
\* Rule: once every request is answered, the day's outcome is the one its attempts call for:
\* a day with attempts never ends "nothing_due", and no grade or undo is lost.
\* Each D1 statement is one step; the requests interleave between statements.
EXTENDS Naturals, FiniteSets

CONSTANTS Grades, Undos, Visits, \* the requests, as sets of names
          Goal,       \* review_days.goal
          Due,        \* cards drawableCount finds before any grade today
          CompareAndSet, \* settleDay writes only over the outcome and attempts it read, and reads again
          ReadsDayFirst, \* settleDay reads the day row itself rather than deciding from its caller's copy
          NoNothingDueWithAttempts, \* nextOutcome turns a kept nothing_due into open once there are attempts
          Tries          \* SETTLE_TRIES

Requests == Grades \cup Undos \cup Visits
Kind(r) == IF r \in Grades THEN "grade" ELSE IF r \in Undos THEN "undo" ELSE "visit"
First(r) == IF Kind(r) = "visit" THEN "due" ELSE "read"

VARIABLES outcome,  \* review_days.outcome
          zeroDue,  \* review_days.zero_due_confirmed_at is set
          attempts, \* reviews less review_undos on the day: what attemptsOn counts
          pc,       \* where each request is
          seen,     \* the day row each request last read: [outcome, zeroDue]
          counted,  \* the attempts each request last counted
          dueSeen,  \* checkToday's drawableCount, read before the day row
          tries

vars == <<outcome, zeroDue, attempts, pc, seen, counted, dueSeen, tries>>

\* drawableCount: a graded card leaves today's draw until its grade is taken back.
Drawable(a) == IF a >= Due THEN 0 ELSE Due - a

\* settleDay's outcome for a day that already holds `a` grades and nothing in flight.
Settled(a) ==
  IF a >= Goal THEN "goal_met" ELSE IF a > 0 /\ Drawable(a) = 0 THEN "exhausted" ELSE "open"

\* The day may already hold one grade from earlier, made on this device or another. Undo takes
\* that one back, so with none there is no Undo to send.
Init ==
  /\ attempts \in {0, 1}
  /\ outcome = Settled(attempts) /\ zeroDue = FALSE
  /\ pc = [r \in Requests |-> IF Kind(r) = "undo" /\ attempts = 0 THEN "done" ELSE First(r)]
  /\ seen = [r \in Requests |-> [outcome |-> "open", zeroDue |-> FALSE]]
  /\ counted = [r \in Requests |-> 0]
  /\ dueSeen = [r \in Requests |-> 0]
  /\ tries = [r \in Requests |-> 0]

Row == [outcome |-> outcome, zeroDue |-> zeroDue]
Go(r, to) == pc' = [pc EXCEPT ![r] = to]
\* Where settleDay starts.
Settle == IF ReadsDayFirst THEN "fresh" ELSE "count"

\* settleDay on main: the outcome from what it read, written over whatever is there.
MainOutcome(r, a) ==
  LET nothingLeft == a > 0 /\ a < Goal /\ Drawable(a) = 0
  IN IF a >= Goal THEN "goal_met"
     ELSE IF nothingLeft THEN "exhausted"
     ELSE IF Kind(r) = "undo" THEN (IF seen[r].zeroDue THEN "nothing_due" ELSE "open")
     ELSE seen[r].outcome

\* nextOutcome in streak.ts, with settleDay's nothingLeft. A visit's first try uses its own
\* drawableCount, read before the day row.
NextOutcome(r, a) ==
  LET due == IF Kind(r) = "visit" /\ tries[r] = 0 THEN dueSeen[r] ELSE Drawable(a)
      nothingLeft == a < Goal /\ (a > 0 \/ Kind(r) = "visit") /\ due = 0
      change == Kind(r)
  IN IF a >= Goal THEN "goal_met"
     ELSE IF nothingLeft /\ a > 0 THEN "exhausted"
     ELSE IF change = "visit" /\ nothingLeft /\ a = 0 /\ seen[r].outcome = "open" THEN "nothing_due"
     ELSE LET kept == IF change = "undo"
                        THEN (IF seen[r].zeroDue THEN "nothing_due" ELSE "open")
                        ELSE seen[r].outcome
          IN IF NoNothingDueWithAttempts /\ kept = "nothing_due" /\ a > 0 THEN "open" ELSE kept

Unchanged(r) == UNCHANGED <<outcome, zeroDue, attempts, counted, dueSeen, tries>>

\* checkToday: drawableCount first.
VisitCountsDue(r) ==
  /\ pc[r] = "due"
  /\ dueSeen' = [dueSeen EXCEPT ![r] = Drawable(attempts)]
  /\ Go(r, "read")
  /\ UNCHANGED <<outcome, zeroDue, attempts, seen, counted, tries>>

\* The day row: openDay in a grade, the select in undoReview and checkToday.
Reads(r) ==
  /\ pc[r] = "read"
  /\ seen' = [seen EXCEPT ![r] = Row]
  /\ Go(r, CASE Kind(r) = "grade" -> "insert"
             [] Kind(r) = "undo" -> "restore"
             [] OTHER -> IF CompareAndSet THEN Settle ELSE "visitCount")
  /\ Unchanged(r)

\* gradeCard's batch: the card's state and the review row.
GradeLands(r) ==
  /\ pc[r] = "insert"
  /\ attempts' = attempts + 1
  /\ Go(r, Settle)
  /\ UNCHANGED <<outcome, zeroDue, seen, counted, dueSeen, tries>>

\* restoreIfLatest takes the earlier grade back.
UndoLands(r) ==
  /\ pc[r] = "restore"
  /\ attempts' = attempts - 1
  /\ Go(r, Settle)
  /\ UNCHANGED <<outcome, zeroDue, seen, counted, dueSeen, tries>>

\* main's checkToday: with nothing due, it counts attempts itself and confirms an empty open day.
VisitCounts(r) ==
  /\ pc[r] = "visitCount"
  /\ IF dueSeen[r] = 0
       THEN /\ counted' = [counted EXCEPT ![r] = attempts]
            /\ Go(r, IF attempts = 0 /\ seen[r].outcome = "open" THEN "confirm" ELSE Settle)
       ELSE UNCHANGED counted /\ Go(r, Settle)
  /\ UNCHANGED <<outcome, zeroDue, attempts, seen, dueSeen, tries>>

VisitConfirms(r) ==
  /\ pc[r] = "confirm"
  /\ outcome' = "nothing_due" /\ zeroDue' = TRUE
  /\ Go(r, "done")
  /\ UNCHANGED <<attempts, seen, counted, dueSeen, tries>>

\* A select of the day row at the top of settleDay.
ReadsAgain(r) ==
  /\ pc[r] = "fresh"
  /\ seen' = [seen EXCEPT ![r] = Row]
  /\ Go(r, "count")
  /\ Unchanged(r)

\* settleDay's attemptsOn; its drawableCount reads the same moment.
Counts(r) ==
  /\ pc[r] = "count"
  /\ counted' = [counted EXCEPT ![r] = attempts]
  /\ LET next == IF CompareAndSet THEN NextOutcome(r, attempts) ELSE MainOutcome(r, attempts)
     IN Go(r, IF next = seen[r].outcome THEN "done" ELSE "write")
  /\ UNCHANGED <<outcome, zeroDue, attempts, seen, dueSeen, tries>>

\* settleDay's update. With CompareAndSet it lands only over the outcome and attempts it read.
Writes(r) ==
  /\ pc[r] = "write"
  /\ LET next == IF CompareAndSet THEN NextOutcome(r, counted[r]) ELSE MainOutcome(r, counted[r])
         confirming == Kind(r) = "visit" /\ next = "nothing_due"
         lands == ~CompareAndSet \/ (outcome = seen[r].outcome /\ attempts = counted[r])
     IN IF lands
          THEN /\ outcome' = next
               /\ zeroDue' = (zeroDue \/ (CompareAndSet /\ confirming))
               /\ Go(r, "done")
          ELSE UNCHANGED <<outcome, zeroDue>> /\ Go(r, "reread")
  /\ UNCHANGED <<attempts, seen, counted, dueSeen, tries>>

\* A write that did not land reads the day again, and gives up after Tries.
Rereads(r) ==
  /\ pc[r] = "reread"
  /\ seen' = [seen EXCEPT ![r] = Row]
  /\ tries' = [tries EXCEPT ![r] = @ + 1]
  /\ Go(r, IF tries[r] + 1 >= Tries THEN "done" ELSE "count")
  /\ UNCHANGED <<outcome, zeroDue, attempts, counted, dueSeen>>

\* Every request has its answer, or was never sent.
Quiet == \A r \in Requests : pc[r] \in {"done", First(r)}
Done == (\A r \in Requests : pc[r] = "done") /\ UNCHANGED vars

Next ==
  \/ \E r \in Requests :
       \/ VisitCountsDue(r) \/ Reads(r) \/ GradeLands(r) \/ UndoLands(r)
       \/ VisitCounts(r) \/ VisitConfirms(r) \/ ReadsAgain(r) \/ Counts(r) \/ Writes(r) \/ Rereads(r)
  \/ Done

Spec == Init /\ [][Next]_vars

\* What a day's attempts call for once nothing is in flight. A day with no attempts may be open
\* or confirmed as nothing due, whichever the last visit found.
Expected ==
  IF attempts >= Goal THEN {"goal_met"}
  ELSE IF attempts > 0 THEN (IF Drawable(attempts) = 0 THEN {"exhausted"} ELSE {"open"})
  ELSE {"open", "nothing_due"}

NothingDueOnlyWithoutAttempts == Quiet => (attempts > 0 => outcome # "nothing_due")
NoLostUpdate == Quiet => outcome \in Expected
====
