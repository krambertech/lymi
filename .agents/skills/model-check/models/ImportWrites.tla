---- MODULE ImportWrites ----
\* An import's write run against the learner's cancel and archive and the expiry cron:
\* apps/web/src/server/imports/write-run.ts, writeChunk in services/import-writer.ts, and
\* confirmImport, finishImport, failImport, cancelImport and expireImports in services/imports.ts.
\* Rule: once an import is failed, cancelled or done, no chunk adds a card.
\* Each D1 statement or batch is one step; the actors interleave between them.
EXTENDS Naturals

CONSTANTS Chunks,
          ChunkChecksStatus \* writeChunk's guard also requires status = 'importing'

Ended == {"done", "failed", "cancelled"}

VARIABLES status,   \* imports.status
          written,  \* imports.written: chunks that landed
          cards,    \* chunks whose cards are in the learner's account
          archived, \* imports.archived_at is set, with the cards it covered
          active,   \* chunks whose cards are active after the archive
          late,     \* a chunk added cards while the import had ended
          run,      \* the write run: where it is
          chunk,    \* the chunk the run is on
          fail,     \* the cron's failImport: where it is, and the status it read
          failSaw,
          cancel,   \* cancelImport: where it is, and the status it read
          cancelSaw,
          archive   \* archiveImport: where it is

vars == <<status, written, cards, archived, active, late, run, chunk, fail, failSaw,
          cancel, cancelSaw, archive>>

Init ==
  /\ status = "ready" /\ written = 0 /\ cards = {} /\ archived = FALSE /\ active = {}
  /\ late = FALSE /\ run = "waiting" /\ chunk = 0
  /\ fail = "idle" /\ failSaw = "ready"
  /\ cancel = "idle" /\ cancelSaw = "ready"
  /\ archive = "idle"

\* confirmImport: ready to importing, which starts the run.
Confirm ==
  /\ status = "ready"
  /\ status' = "importing" /\ run' = "read"
  /\ UNCHANGED <<written, cards, archived, active, late, chunk, fail, failSaw, cancel, cancelSaw, archive>>

\* readyWork's ownedImport at the top of a chunk step. It does not look at the status.
RunReads ==
  /\ run = "read"
  /\ run' = IF chunk < Chunks THEN "batch" ELSE "finish"
  /\ UNCHANGED <<status, written, cards, archived, active, late, chunk, fail, failSaw, cancel, cancelSaw, archive>>

\* writeChunk's batch: every statement runs only while `written` equals this chunk
\* (and, with the guard, while the import is importing).
ChunkLands ==
  /\ run = "batch"
  /\ LET lands == written = chunk /\ (ChunkChecksStatus => status = "importing")
     IN IF lands
          THEN /\ written' = written + 1
               /\ cards' = cards \cup {chunk}
               /\ active' = IF archived THEN active \cup {chunk} ELSE active
               /\ late' = (late \/ status \in Ended)
          ELSE UNCHANGED <<written, cards, active, late>>
  /\ chunk' = chunk + 1 /\ run' = "read"
  /\ UNCHANGED <<status, archived, fail, failSaw, cancel, cancelSaw, archive>>

\* finishImport: importing to done, only over importing.
Finish ==
  /\ run = "finish"
  /\ IF status = "importing" THEN status' = "done" ELSE UNCHANGED status
  /\ run' = "over"
  /\ UNCHANGED <<written, cards, archived, active, late, chunk, fail, failSaw, cancel, cancelSaw, archive>>

\* expireImports finds the import stalled (abstracted: at any time while importing), and
\* failImport reads the row; the same failImport runs when the run's own step fails.
FailReads ==
  /\ fail = "idle" /\ status = "importing"
  /\ fail' = "write" /\ failSaw' = status
  /\ UNCHANGED <<status, written, cards, archived, active, late, run, chunk, cancel, cancelSaw, archive>>

\* failImport's update, only over the status it read.
FailWrites ==
  /\ fail = "write"
  /\ IF failSaw \notin Ended /\ status = failSaw THEN status' = "failed" ELSE UNCHANGED status
  /\ fail' = "over"
  /\ UNCHANGED <<written, cards, archived, active, late, run, chunk, failSaw, cancel, cancelSaw, archive>>

\* cancelImport: the learner's way out before anything is written.
CancelReads ==
  /\ cancel = "idle"
  /\ cancel' = IF status \in {"ready"} THEN "write" ELSE "over"
  /\ cancelSaw' = status
  /\ UNCHANGED <<status, written, cards, archived, active, late, run, chunk, fail, failSaw, archive>>

CancelWrites ==
  /\ cancel = "write"
  /\ IF status \in {"ready"} THEN status' = "cancelled" ELSE UNCHANGED status
  /\ cancel' = "over"
  /\ UNCHANGED <<written, cards, archived, active, late, run, chunk, fail, failSaw, cancelSaw, archive>>

\* archiveImport: once done or failed, it archives every card the import added so far.
ArchiveReads ==
  /\ archive = "idle" /\ status \in {"done", "failed"}
  /\ archive' = "write"
  /\ UNCHANGED <<status, written, cards, archived, active, late, run, chunk, fail, failSaw, cancel, cancelSaw>>

ArchiveWrites ==
  /\ archive = "write"
  /\ archived' = TRUE /\ active' = {}
  /\ archive' = "over"
  /\ UNCHANGED <<status, written, cards, late, run, chunk, fail, failSaw, cancel, cancelSaw>>

Quiet == run \in {"waiting", "over"} /\ fail # "write" /\ cancel # "write" /\ archive # "write"
Done == Quiet /\ UNCHANGED vars

Next ==
  \/ Confirm \/ RunReads \/ ChunkLands \/ Finish
  \/ FailReads \/ FailWrites \/ CancelReads \/ CancelWrites \/ ArchiveReads \/ ArchiveWrites
  \/ Done

Spec == Init /\ [][Next]_vars

\* No chunk adds cards to an import that had ended, so none appear after its archive.
NoCardsAfterEnd == ~late
ArchiveCoversEveryCard == archived => active = {}
====
