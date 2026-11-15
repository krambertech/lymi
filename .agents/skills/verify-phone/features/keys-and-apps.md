# API keys and connected apps

**API keys** lists the learner's keys for scripts, leaving out the key made for Yomitan, makes one in a sheet and shows it once, and revokes one after iOS's alert; the flow ends on **Apps**, which [apps.md](apps.md) drives ([ADR 0036](../../../../docs/adr/0036-setup-runs-on-the-phone.md), [connected-apps.md](../../../../docs/design/connected-apps.md)).

## Reach

**You**, then **API keys** under Your data.

## Drive

[`keys-and-apps.yaml`](keys-and-apps.yaml), as `learner`: open **API keys**, press **New key**, name it, create it, copy it and press **Done**, then revoke it from its row's ⋯ and confirm in the alert; go back and open **Apps**, whose empty state shows.

## End state

The learner's keys are as they were before the flow, since the key it made was revoked, which [`keys-and-apps.mjs`](keys-and-apps.mjs) reads from `/api/keys`; the flow saw the key once while it existed.

## Gotchas

- The sheet's ✓ is a glass button named **Create key**, and the bar's plus is **New key**.
- A row's ⋯ is named **Options for** the key, and holds **Revoke key**; revoking then asks in iOS's alert, whose buttons are **Keep key** and **Revoke key**, so the flow taps **Revoke key** twice.
- A seeded learner has no connected apps, so Apps shows its empty state.
