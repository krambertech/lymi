---
status: exploration
date: 2026-09-15
decision: open source under AGPL-3.0-only (15 September 2026); self-hosting support not decided
---

# Open source and self-hosting

## Current position

Lymi is open source under AGPL-3.0-only since 15 September 2026, replacing FSL-1.1-MIT. Anyone may run, change and share the code; whoever runs a changed copy as a network service must offer its users the source. Lymi can still charge for a hosted service or extras, and someone else's hosted copy has to stay open. MIT was the simpler alternative and was rejected because it lets anyone run a closed paid copy.

The remaining question is whether self-hosting becomes a supported product promise.

## Why change it

Open source could improve trust in a private learning product, let learners keep access if the hosted service ends, and help integration authors understand or extend the system. It may also attract useful review and contributions.

Those benefits are hypotheses. Public code already creates maintenance, security, licensing, and privacy obligations; a self-hosting promise adds installation, upgrades, backups, provider configuration, and support. Contributions are not free capacity.

## Options

1. Offer no self-hosting promise. The code stays open while the hosted service remains the product.
2. Document a best-effort self-hosting path. This improves continuity but may confuse users about support.
3. Support self-hosting explicitly. This gives the clearest continuity but requires a deliberate commercial, trademark, contribution, and support model.

## Boundaries

Any direction must keep secrets, personal data, production identifiers, private strategy, and user content out of tracked files and history. The Lymi name and lantern mark need a clear trademark boundary separate from the code license.

A supported self-hosted release needs safe example configuration, dependency and asset licensing, security reporting, fresh-install and upgrade checks, backup and restore guidance, and clear responsibility for AI and infrastructure costs. The public repository should remain canonical rather than becoming a stale mirror.

## Evidence needed

- Learners say inspectability, continuity, or self-hosting changes their trust or willingness to use Lymi.
- Integration authors or contributors have specific work they want to maintain.
- The hosted service remains clearly easier than self-hosting.
- Maintainer capacity exists for issues, reviews, releases, and security response.

## Open questions

- Is self-hosting part of the product promise?
- Should outside contributions require a contributor agreement, so the code can still be relicensed or dual-licensed later?
- Is the primary goal trust, continuity, contributions, or developer distribution?
- What support can self-hosters and contributors reasonably expect?
- Which product and strategy documents belong in the public repository?
