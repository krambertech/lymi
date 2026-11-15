---- MODULE AddSheet ----
\* The add-a-card sheet on the web: typing, Add, closing, the save's answer and Undo on the
\* "Card discarded" toast. apps/web/src/client/components/add-card-sheet.tsx and
\* apps/web/src/client/lib/sheet-phase.ts; see the skill for which step is which code.
EXTENDS Naturals, FiniteSets

CONSTANTS
  MaxDrafts,          \* how many separate drafts the learner types in one run
  HoldsWhileSaving    \* close() refuses while phase is "saving" (sheetPhase "close" without saved)

VARIABLES
  phase,     \* sheetPhase: "closed", "editing" or "saving"
  draft,     \* the draft in the form: 0 for empty, else its number
  typed,     \* how many drafts have been typed so far
  inFlight,  \* the draft whose writes.addCard is in flight, or 0
  undo,      \* the draft the "Card discarded" toast's Undo would bring back, or 0
  adds       \* adds[d]: how many cards draft d has added

vars == <<phase, draft, typed, inFlight, undo, adds>>
Drafts == 1..MaxDrafts

Init ==
  /\ phase = "closed" /\ draft = 0 /\ typed = 0 /\ inFlight = 0 /\ undo = 0
  /\ adds = [d \in Drafts |-> 0]

\* The parent opens the sheet: a fresh form, the toast left as it is.
YouOpen ==
  /\ phase = "closed"
  /\ phase' = "editing" /\ draft' = 0
  /\ UNCHANGED <<typed, inFlight, undo, adds>>

\* Typing into an empty form starts a new draft.
YouType ==
  /\ phase = "editing" /\ draft = 0 /\ typed < MaxDrafts
  /\ typed' = typed + 1 /\ draft' = typed + 1
  /\ UNCHANGED <<phase, inFlight, undo, adds>>

\* submit(): dispatch save, then writes.addCard. The form's button is busy while saving.
YouAdd ==
  /\ phase = "editing" /\ draft # 0 /\ inFlight = 0
  /\ phase' = "saving" /\ inFlight' = draft
  /\ UNCHANGED <<draft, typed, undo, adds>>

\* close(true) from Cancel, Escape or the backdrop. With work in the form, the toast offers Undo.
YouClose ==
  /\ phase \in {"editing", "saving"}
  /\ HoldsWhileSaving => phase # "saving"
  /\ phase' = "closed" /\ draft' = 0
  /\ undo' = IF draft # 0 THEN draft ELSE undo
  /\ UNCHANGED <<typed, inFlight, adds>>

\* The card is in. The server answers "already in" for a term the deck has, so a draft that
\* already added its card never adds another; that answer is SaveFails.
\* With Create more the form clears and stays; otherwise close(false, true).
\* That close runs whatever the sheet shows now, so a sheet reopened by Undo is closed by it.
SaveLands ==
  /\ inFlight # 0 /\ adds[inFlight] = 0
  /\ adds' = [adds EXCEPT ![inFlight] = @ + 1]
  /\ inFlight' = 0
  /\ \/ phase = "saving" /\ phase' = "editing" /\ draft' = 0   \* Create more
     \/ phase' = "closed" /\ draft' = 0                       \* the sheet closes
  /\ UNCHANGED <<typed, undo>>

\* A failure, or "already in": settle puts a saving sheet back to editing, draft kept.
SaveFails ==
  /\ inFlight # 0
  /\ inFlight' = 0
  /\ phase' = IF phase = "saving" THEN "editing" ELSE phase
  /\ UNCHANGED <<draft, typed, undo, adds>>

\* Undo on the toast: the draft comes back in a reopened sheet. Modeled from a closed sheet.
YouUndo ==
  /\ undo # 0 /\ phase = "closed"
  /\ phase' = "editing" /\ draft' = undo /\ undo' = 0
  /\ UNCHANGED <<typed, inFlight, adds>>

Next == YouOpen \/ YouType \/ YouAdd \/ YouClose \/ SaveLands \/ SaveFails \/ YouUndo

Spec == Init /\ [][Next]_vars

\* Undo on "Card discarded" never offers back a draft whose card is already in.
NoUndoForSaved == undo = 0 \/ adds[undo] = 0
====
