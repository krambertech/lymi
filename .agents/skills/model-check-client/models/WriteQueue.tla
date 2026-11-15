---- MODULE WriteQueue ----
\* The offline write queue's claim, packages/client/src/writes.ts and queued.ts.
\* Rule: a write one learner queued is never sent on another learner's session.
EXTENDS Naturals, FiniteSets

\* The three guards are constants so that each can be turned off to watch the rule break.
CONSTANTS Learners, MaxWrites, MaxClaims,
          ReleasesOnSignOut,    \* unclaimWrites in Sync's cleanup; dropWrites clears memory and the claim
          ChecksClaimOnFailure, \* `claim !== mine` in flushQueued's catch, before put()
          ChecksClaimBeforeSend \* `claim !== mine` in flushQueued's loop, after flushGrades and before sendWithin

None == "none"
NoRequest == [w |-> <<None, 0>>, as |-> None, on |-> FALSE]

VARIABLES session, \* who the auth session belongs to; config.headers() reads it per request
          claim,   \* writes.ts `claim`: the learner, or None for UNCLAIMED
          epoch,   \* each claimWrites makes a new claim object; `mine` compares by identity
          owner,   \* storage QUEUED_FOR_KEY
          stored,  \* storage entries under WRITE_PREFIX
          cached,  \* writes.ts `cache !== null`
          cache,   \* writes.ts `cache`
          flushing, mine, todo, \* one flushQueued run: its claim and its snapshot of read()
          air,     \* the request in flight, with the session it went out on
          sent,    \* what the server accepted, and on whose session
          made

vars == <<session, claim, epoch, owner, stored, cached, cache, flushing, mine, todo, air, sent, made>>

Read == IF cached THEN cache ELSE stored
Current == <<claim, epoch>>

Init ==
  /\ session = None /\ claim = None /\ epoch = 0 /\ owner = None
  /\ stored = {} /\ cached = FALSE /\ cache = {}
  /\ flushing = FALSE /\ mine = <<None, 0>> /\ todo = {}
  /\ air = NoRequest /\ sent = {} /\ made = 0

SignIn(u) ==
  /\ session = None
  /\ session' = u
  /\ UNCHANGED <<claim, epoch, owner, stored, cached, cache, flushing, mine, todo, air, sent, made>>

\* Sync's effect: claimWrites(learnerId), which calls claimQueued.
SyncClaims ==
  /\ session # None /\ claim # session /\ epoch < MaxClaims
  /\ stored' = IF owner \notin {None, session} THEN {} ELSE stored
  /\ owner' = session
  /\ cached' = FALSE /\ cache' = {}
  /\ claim' = session /\ epoch' = epoch + 1
  /\ UNCHANGED <<session, flushing, mine, todo, air, sent, made>>

\* submit(): put() writes the entry to memory and storage.
Submit ==
  /\ session # None /\ claim = session /\ made < MaxWrites
  /\ LET w == <<session, made>> IN
       /\ cache' = Read \cup {w} /\ cached' = TRUE
       /\ stored' = stored \cup {w}
  /\ made' = made + 1
  /\ UNCHANGED <<session, claim, epoch, owner, flushing, mine, todo, air, sent>>

\* flushQueued begins: refuses while unclaimed, then snapshots read().
FlushStarts ==
  /\ ~flushing /\ claim # None /\ Read # {}
  /\ flushing' = TRUE /\ mine' = Current /\ todo' = Read
  /\ cached' = TRUE /\ cache' = Read
  /\ UNCHANGED <<session, claim, epoch, owner, stored, air, sent, made>>

FlushStopsOnClaim ==
  /\ flushing /\ ~air.on /\ todo # {}
  /\ ChecksClaimBeforeSend /\ mine # Current
  /\ flushing' = FALSE /\ todo' = {}
  /\ UNCHANGED <<session, claim, epoch, owner, stored, cached, cache, mine, air, sent, made>>

\* sendWithin(entry.write): the request takes the session of the moment it leaves.
\* The loop awaits flushGrades before each send, so the learner can change before this step.
SendLeaves(w) ==
  /\ flushing /\ ~air.on /\ w \in todo
  /\ ChecksClaimBeforeSend => mine = Current
  /\ air' = [w |-> w, as |-> session, on |-> TRUE]
  /\ UNCHANGED <<session, claim, epoch, owner, stored, cached, cache, flushing, mine, todo, sent, made>>

SendLeavesAny == \E w \in todo : SendLeaves(w)

SendLands ==
  /\ air.on /\ air.as # None
  /\ sent' = sent \cup {[author |-> air.w[1], as |-> air.as]}
  /\ cache' = Read \ {air.w} /\ cached' = TRUE
  /\ stored' = stored \ {air.w}
  /\ todo' = todo \ {air.w}
  /\ air' = NoRequest
  /\ UNCHANGED <<session, claim, epoch, owner, flushing, mine, made>>

\* Offline, or no session (401): the loop breaks and nothing is written back.
SendStops ==
  /\ air.on
  /\ air' = NoRequest /\ flushing' = FALSE /\ todo' = {}
  /\ UNCHANGED <<session, claim, epoch, owner, stored, cached, cache, mine, sent, made>>

\* A server failure: put() writes the entry back with its retry time.
SendFails ==
  /\ air.on /\ air.as # None
  /\ air' = NoRequest
  /\ IF ChecksClaimOnFailure /\ mine # Current
       THEN /\ flushing' = FALSE /\ todo' = {}
            /\ UNCHANGED <<stored, cached, cache>>
       ELSE /\ cache' = Read \cup {air.w} /\ cached' = TRUE
            /\ stored' = stored \cup {air.w}
            /\ todo' = todo \ {air.w}
            /\ UNCHANGED flushing
  /\ UNCHANGED <<session, claim, epoch, owner, mine, sent, made>>

FlushEnds ==
  /\ flushing /\ todo = {} /\ ~air.on
  /\ flushing' = FALSE
  /\ UNCHANGED <<session, claim, epoch, owner, stored, cached, cache, mine, todo, air, sent, made>>

\* The session ends, by sign-out or by lapsing. Sync unmounts in the same commit.
SessionEnds ==
  /\ session # None
  /\ session' = None
  /\ claim' = IF ReleasesOnSignOut THEN None ELSE claim
  /\ UNCHANGED <<epoch, owner, stored, cached, cache, flushing, mine, todo, air, sent, made>>

\* The phone's leave() after signOut: dropQueued on main, dropWrites now.
Drops ==
  /\ session = None /\ (stored # {} \/ owner # None \/ cached)
  /\ stored' = {} /\ owner' = None
  /\ IF ReleasesOnSignOut
       THEN cached' = FALSE /\ cache' = {} /\ claim' = None
       ELSE UNCHANGED <<cached, cache, claim>>
  /\ UNCHANGED <<session, epoch, flushing, mine, todo, air, sent, made>>

Next ==
  \/ \E u \in Learners : SignIn(u)
  \/ SyncClaims \/ Submit \/ FlushStarts \/ FlushStopsOnClaim
  \/ SendLeavesAny
  \/ SendLands \/ SendStops \/ SendFails \/ FlushEnds
  \/ SessionEnds \/ Drops

Spec == Init /\ [][Next]_vars

NoCrossSend == \A r \in sent : r.author = r.as
====
