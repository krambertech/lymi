---- MODULE GradeOutbox ----
\* Grades of one card in one mode, from the device's outbox in packages/client/src/grades.ts to
\* gradeCard and undoReview on the server, with a network that loses answers and delivers late.
\* Rules: a grade the learner made and kept ends up counted, and one they took back does not,
\* unless a later grade from another device came first. The schedule holds what is counted.
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Mine,     \* this device's grades, as review times
          Others,   \* another device's grades, as review times
          MaxRequests,
          Kills,    \* how often the app may be killed mid-send
          MarksBeforeSend,        \* a grade is marked unanswered before its request leaves
          ReplaysUnanswered,      \* an unanswered grade taken back is sent again to learn its attempt
          HoldsMode,              \* a grade waits behind one of its mode the server could not take
          SeesLateUndo,           \* a grade also waits behind an undo made after the run took its list
          LandsOverRead,          \* the server's update lands only over the state it read
          DuplicateNamesAttempt   \* a replay of a stored grade names the attempt

Grades == Mine \cup Others
Ids == 1..MaxRequests
Max(s) == CHOOSE x \in s : \A y \in s : y <= x
Min(s) == CHOOSE x \in s : \A y \in s : x <= y
Last(h) == IF h = <<>> THEN 0 ELSE h[Len(h)]
Free == [phase |-> "free", kind |-> "grade", g |-> 0, saw |-> <<>>, answer |-> "none"]

VARIABLES made, takenBack,
          entry,      \* the outbox: "none", "queued", "sent" or "gone" for each of Mine
          undone, unanswered, named, \* StoredGrade.undone, .unanswered and whether .reviewId is kept
          pc, waiting, \* the one flush or settle in progress, and the request it waits on
          flushing, todoUndos, todoGrades, held,
          req,        \* every request ever sent: free, out, read, answered or lost
          hist,       \* the card state: the grades its schedule was built from, in order
          stored, undoneAt, before, \* reviews, review_undos and reviews.state_before
          kills

client == <<made, takenBack, entry, undone, unanswered, named>>
run == <<pc, waiting, flushing, todoUndos, todoGrades, held>>
server == <<hist, stored, undoneAt, before>>
vars == <<client, run, req, server, kills>>

Init ==
  /\ made = {} /\ takenBack = {}
  /\ entry = [g \in Mine |-> "none"]
  /\ undone = [g \in Mine |-> FALSE] /\ unanswered = [g \in Mine |-> FALSE]
  /\ named = [g \in Mine |-> FALSE]
  /\ pc = "idle" /\ waiting = 0 /\ flushing = FALSE
  /\ todoUndos = {} /\ todoGrades = {} /\ held = FALSE
  /\ req = [i \in Ids |-> Free]
  /\ hist = <<>> /\ stored = {} /\ undoneAt = {} /\ before = [g \in Grades |-> <<>>]
  /\ kills = 0

NextId == Min({i \in Ids : req[i].phase = "free"} \cup {MaxRequests + 1})
CanSend == NextId \in Ids
Out(kind, g) == [req EXCEPT ![NextId] = [Free EXCEPT !.phase = "out", !.kind = kind, !.g = g]]

\* ---- The learner, who acts only while the run awaits something ----

Awaits == {"idle", "replay", "undo", "send", "settleElsewhere", "flushElsewhere"}

\* recordGrade's write: the grade is in the outbox at once.
Make(g) ==
  /\ pc \in Awaits
  /\ g \in Mine \ made /\ \A h \in Mine : h < g => h \in made
  /\ made' = made \cup {g} /\ entry' = [entry EXCEPT ![g] = "queued"]
  /\ UNCHANGED <<takenBack, undone, unanswered, named, run, req, server, kills>>

\* undoGrade's write. A review offers Undo for the last grade made, once: `last` in review-flow/core.ts.
TakeBack(g) ==
  /\ pc \in Awaits
  /\ g \in made \ takenBack /\ g = Max(made)
  /\ entry[g] \in {"queued", "sent"}
  /\ takenBack' = takenBack \cup {g} /\ undone' = [undone EXCEPT ![g] = TRUE]
  /\ UNCHANGED <<made, entry, unanswered, named, run, req, server, kills>>

\* ---- The outbox: one run at a time, as serial() allows ----

Kept(g) == entry[g] \in {"queued", "sent"}
Undos == {g \in Mine : Kept(g) /\ undone[g]}
Queued == {g \in Mine : entry[g] = "queued" /\ ~undone[g]}

\* undoGrade settles; recordGrade and flushOutbox settle and then send.
Starts(flush) ==
  /\ pc = "idle" /\ (Undos # {} \/ Queued # {})
  /\ pc' \in {"settle", "settleElsewhere"} /\ flushing' = flush /\ todoUndos' = Undos
  /\ todoGrades' = {} /\ held' = FALSE
  /\ UNCHANGED <<client, waiting, req, server, kills>>

\* The run awaits a request of another mode, before it reaches this one.
ElsewhereAnswers ==
  /\ pc \in {"settleElsewhere", "flushElsewhere"}
  /\ pc' = IF pc = "settleElsewhere" THEN "settle" ELSE "flush"
  /\ UNCHANGED <<client, waiting, flushing, todoUndos, todoGrades, held, req, server, kills>>

Stops ==
  /\ pc' = "idle" /\ waiting' = 0 /\ flushing' = FALSE
  /\ todoUndos' = {} /\ todoGrades' = {} /\ held' = FALSE

\* settleUndos, one grade taken back at a time, oldest first.
SettleForgets ==
  /\ pc = "settle" /\ todoUndos # {}
  /\ LET g == Min(todoUndos) IN
       /\ entry[g] = "queued" /\ (~unanswered[g] \/ ~ReplaysUnanswered)
       /\ entry' = [entry EXCEPT ![g] = "gone"]
       /\ todoUndos' = todoUndos \ {g}
  /\ UNCHANGED <<made, takenBack, undone, unanswered, named, pc, waiting, flushing, todoGrades, held, req, server, kills>>

SettleReplays ==
  /\ pc = "settle" /\ todoUndos # {} /\ CanSend
  /\ LET g == Min(todoUndos) IN
       /\ entry[g] = "queued" /\ unanswered[g] /\ ReplaysUnanswered
       /\ req' = Out("grade", g)
  /\ waiting' = NextId /\ pc' = "replay"
  /\ UNCHANGED <<client, flushing, todoUndos, todoGrades, held, server, kills>>

SettleStands ==
  /\ pc = "settle" /\ todoUndos # {}
  /\ LET g == Min(todoUndos) IN
       /\ entry[g] = "sent" /\ ~named[g]
       /\ undone' = [undone EXCEPT ![g] = FALSE]
       /\ todoUndos' = todoUndos \ {g}
  /\ UNCHANGED <<made, takenBack, entry, unanswered, named, pc, waiting, flushing, todoGrades, held, req, server, kills>>

SettleUndoes ==
  /\ pc = "settle" /\ todoUndos # {} /\ CanSend
  /\ LET g == Min(todoUndos) IN
       /\ entry[g] = "sent" /\ named[g]
       /\ req' = Out("undo", g)
  /\ waiting' = NextId /\ pc' = "undo"
  /\ UNCHANGED <<client, flushing, todoUndos, todoGrades, held, server, kills>>

SettleEnds ==
  /\ pc = "settle" /\ todoUndos = {}
  /\ IF flushing
       THEN pc' \in {"flush", "flushElsewhere"} /\ todoGrades' = Queued /\ UNCHANGED <<waiting, flushing, todoUndos, held>>
       ELSE Stops
  /\ UNCHANGED <<client, req, server, kills>>

\* flushQueued's loop over its snapshot. With one mode, the first held grade holds the rest.
Holds == (held /\ HoldsMode) \/ (SeesLateUndo /\ Undos # {})

FlushSends ==
  /\ pc = "flush" /\ todoGrades # {} /\ ~Holds /\ CanSend
  /\ LET g == Min(todoGrades) IN
       /\ req' = Out("grade", g)
       /\ unanswered' = IF MarksBeforeSend THEN [unanswered EXCEPT ![g] = TRUE] ELSE unanswered
  /\ waiting' = NextId /\ pc' = "send"
  /\ UNCHANGED <<made, takenBack, entry, undone, named, flushing, todoUndos, todoGrades, held, server, kills>>

FlushEnds ==
  /\ pc = "flush" /\ (todoGrades = {} \/ Holds)
  /\ Stops
  /\ UNCHANGED <<client, req, server, kills>>

\* The answer reaches the client. send() records it on the entry, wherever it is by then.
Answer == req[waiting].answer
Current == req[waiting].g

GradeAnswered ==
  /\ pc \in {"replay", "send"} /\ req[waiting].phase = "answered" /\ Answer \in {"stored", "named", "unnamed"}
  /\ LET g == Current IN
       IF Answer = "unnamed"
         THEN /\ entry' = [entry EXCEPT ![g] = "gone"] /\ UNCHANGED named
              /\ pc' = IF pc = "replay" THEN "settle" ELSE "flush"
              /\ todoUndos' = todoUndos \ {g} /\ todoGrades' = todoGrades \ {g}
         ELSE /\ entry' = [entry EXCEPT ![g] = "sent"] /\ named' = [named EXCEPT ![g] = TRUE]
              /\ pc' = IF pc = "replay" THEN "settle" ELSE "flush"
              /\ todoGrades' = todoGrades \ {g} /\ UNCHANGED todoUndos
  /\ waiting' = 0
  /\ UNCHANGED <<made, takenBack, undone, unanswered, flushing, held, req, server, kills>>

UndoAnswered ==
  /\ pc = "undo" /\ req[waiting].phase = "answered" /\ Answer \in {"ok", "refused"}
  /\ LET g == Current IN
       /\ IF Answer = "ok"
            THEN entry' = [entry EXCEPT ![g] = "gone"] /\ UNCHANGED undone
            ELSE undone' = [undone EXCEPT ![g] = FALSE] /\ UNCHANGED entry
       /\ todoUndos' = todoUndos \ {g}
  /\ pc' = "settle" /\ waiting' = 0
  /\ UNCHANGED <<made, takenBack, unanswered, named, flushing, todoGrades, held, req, server, kills>>

\* A 5xx, before the server wrote anything or after it did: the mode is held and the run goes on.
ServerFails ==
  /\ pc \in {"replay", "send", "undo"} /\ req[waiting].phase \in {"out", "read", "answered"}
  /\ req' = IF req[waiting].phase = "answered" THEN req ELSE [req EXCEPT ![waiting].phase = "lost"]
  /\ held' = TRUE /\ waiting' = 0
  /\ todoUndos' = todoUndos \ {Current} /\ todoGrades' = todoGrades \ {Current}
  /\ pc' = IF pc = "send" THEN "flush" ELSE "settle"
  /\ UNCHANGED <<client, flushing, server, kills>>

\* Offline, or the 20 second limit: the run ends, and the request may still land.
GivesUp ==
  /\ pc \in {"replay", "send", "undo"}
  /\ unanswered' = IF pc = "undo" THEN unanswered ELSE [unanswered EXCEPT ![Current] = TRUE]
  /\ Stops
  /\ UNCHANGED <<made, takenBack, entry, undone, named, req, server, kills>>

\* The app is killed while a request is out: storage keeps the outbox and nothing else.
Killed ==
  /\ pc \in {"replay", "send", "undo"} /\ kills < Kills
  /\ kills' = kills + 1
  /\ Stops
  /\ UNCHANGED <<client, req, server>>

\* ---- The network and the server ----

Lost(i) ==
  /\ req[i].phase = "out" /\ i # waiting
  /\ req' = [req EXCEPT ![i].phase = "lost"]
  /\ UNCHANGED <<client, run, server, kills>>

Answered(i, answer) == req' = [req EXCEPT ![i].phase = "answered", ![i].answer = answer]
Duplicate(g) ==
  IF DuplicateNamesAttempt /\ g \in stored /\ g \notin undoneAt THEN "named" ELSE "unnamed"

\* gradeCard's read of the card state, and its check for a grade no newer than the last one.
GradeReads(i) ==
  /\ req[i].phase = "out" /\ req[i].kind = "grade"
  /\ IF Last(hist) >= req[i].g
       THEN Answered(i, Duplicate(req[i].g))
       ELSE req' = [req EXCEPT ![i].phase = "read", ![i].saw = hist]
  /\ UNCHANGED <<client, run, server, kills>>

\* gradeCard's batch. The attempt's id comes from the grade, so a copy collides and rolls back.
GradeLands(i) ==
  /\ req[i].phase = "read" /\ req[i].kind = "grade"
  /\ LET g == req[i].g
         over == Last(hist) = Last(req[i].saw)
     IN IF g \in stored
          THEN Answered(i, Duplicate(g)) /\ UNCHANGED server
        ELSE IF over \/ ~LandsOverRead
          THEN /\ hist' = Append(req[i].saw, g) /\ stored' = stored \cup {g}
               /\ before' = [before EXCEPT ![g] = req[i].saw]
               /\ Answered(i, "stored") /\ UNCHANGED undoneAt
        ELSE req' = [req EXCEPT ![i].phase = "out"] /\ UNCHANGED server
  /\ UNCHANGED <<client, run, kills>>

UndoReads(i) ==
  /\ req[i].phase = "out" /\ req[i].kind = "undo"
  /\ IF req[i].g \in undoneAt THEN Answered(i, "ok")
     ELSE IF Last(hist) # req[i].g THEN Answered(i, "refused")
     ELSE req' = [req EXCEPT ![i].phase = "read"]
  /\ UNCHANGED <<client, run, server, kills>>

\* restoreIfLatest, then undoReview's read of whether the undo is there.
UndoLands(i) ==
  /\ req[i].phase = "read" /\ req[i].kind = "undo"
  /\ LET g == req[i].g IN
       IF Last(hist) = g
         THEN /\ hist' = before[g] /\ undoneAt' = undoneAt \cup {g}
              /\ Answered(i, "ok") /\ UNCHANGED <<stored, before>>
         ELSE /\ Answered(i, IF g \in undoneAt THEN "ok" ELSE "refused") /\ UNCHANGED server
  /\ UNCHANGED <<client, run, kills>>

\* Another device's grade, through the same read and batch, as one request of its own.
OtherGrades(g) ==
  /\ g \in Others /\ CanSend /\ \A i \in Ids : req[i].g # g
  /\ req' = Out("grade", g)
  /\ UNCHANGED <<client, run, server, kills>>

Quiet ==
  /\ pc = "idle" /\ \A g \in Mine : entry[g] \in {"none", "gone", "sent"} /\ (entry[g] = "sent" => ~undone[g])
  /\ \A i \in Ids : req[i].phase \in {"free", "answered", "lost"}

Next ==
  \/ \E g \in Mine : Make(g) \/ TakeBack(g)
  \/ Starts(TRUE) \/ Starts(FALSE) \/ ElsewhereAnswers
  \/ SettleForgets \/ SettleReplays \/ SettleStands \/ SettleUndoes \/ SettleEnds
  \/ FlushSends \/ FlushEnds
  \/ GradeAnswered \/ UndoAnswered \/ ServerFails \/ GivesUp \/ Killed
  \/ \E i \in Ids : Lost(i) \/ GradeReads(i) \/ GradeLands(i) \/ UndoReads(i) \/ UndoLands(i)
  \/ \E g \in Others : OtherGrades(g)

Spec == Init /\ [][Next]_vars

Counted == stored \ undoneAt
\* A later grade from another device, which the server puts before this one.
Beaten(g) == \E o \in Others : o > g /\ o \in stored

KeptGradesCount == Quiet => \A g \in made \ takenBack : g \in Counted \/ Beaten(g)
TakenBackGradesDoNot == Quiet => \A g \in takenBack : g \notin Counted \/ Beaten(g)
ScheduleHoldsTheCounted ==
  Quiet => /\ {hist[n] : n \in DOMAIN hist} = Counted
           /\ \A n \in DOMAIN hist : n > 1 => hist[n - 1] < hist[n]
====
