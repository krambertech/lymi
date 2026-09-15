---
status: exploration
date: 2026-09-15
decision: decide whether public source should become true open source and a supported self-hosting product
---

# Open source and self-hosting

## Current position

Lymi's repository is public under FSL-1.1-MIT. People may inspect, run, and change the code, but may not offer a competing product until each release converts to MIT after two years. This is source-available software, not open source under the Open Source Definition.

The remaining question is whether Lymi should adopt an open-source license, support self-hosting as a product promise, or keep the current boundary.

## Why change it

Open source could improve trust in a private learning product, let learners keep access if the hosted service ends, and help integration authors understand or extend the system. It may also attract useful review and contributions.

Those benefits are hypotheses. Public code already creates maintenance, security, licensing, and privacy obligations; a self-hosting promise adds installation, upgrades, backups, provider configuration, and support. Contributions are not free capacity.

## Options

1. Keep FSL and offer no self-hosting promise. The code stays inspectable while the hosted service remains the product.
2. Keep FSL but document a best-effort self-hosting path. This improves continuity but may confuse users about support and commercial rights.
3. Adopt an OSI-approved license and support self-hosting explicitly. This gives the clearest openness but requires a deliberate commercial, trademark, contribution, and support model.

## Boundaries

Any direction must keep secrets, personal data, production identifiers, private strategy, and user content out of tracked files and history. The Lymi name and lantern mark need a clear trademark boundary separate from the code license.

A supported self-hosted release needs safe example configuration, dependency and asset licensing, security reporting, fresh-install and upgrade checks, backup and restore guidance, and clear responsibility for AI and infrastructure costs. The public repository should remain canonical rather than becoming a stale mirror.

## Evidence needed

- Learners say inspectability, continuity, or self-hosting changes their trust or willingness to use Lymi.
- Integration authors or contributors have specific work they want to maintain.
- The hosted service remains clearly easier than self-hosting.
- Maintainer capacity exists for issues, reviews, releases, and security response.
- The preferred license fits the intended commercial and contribution model.

## Open questions

- Is source visibility enough, or is self-hosting part of the product promise?
- Is the primary goal trust, continuity, contributions, or developer distribution?
- Should the complete app be open source, and under which license?
- What support can self-hosters and contributors reasonably expect?
- Which product and strategy documents belong in the public repository?
