---
status: exploration
date: 2026-09-06
decision: none
---

# Open-source strategy

This document explores whether publishing Lymi's source code could strengthen the product and make it less expensive to maintain. It is not a decision to make the repository public, adopt a particular license, support self-hosting, or change the current landing-page claims.

The question is not simply whether open source is good. It is whether openness reinforces Lymi's promise strongly enough to justify easier copying, public maintenance, and a broader support surface.

## Current leaning

Open source could be directionally positive for Lymi, primarily as a trust and distribution strategy. It should not be treated as the product's moat or as a substitute for completing the learning experience.

If Lymi eventually makes the complete application open source, AGPL-3.0 is the most promising starting point to evaluate. It would keep modifications offered as a network service open while still allowing commercial use. A managed Lymi service could then charge for convenience, reliable sync, backups, upgrades, authentication, managed AI usage, and support.

That does not mean the current GitHub repository should simply be made public. A release should come from a clean, audited, reproducible repository with an explicit boundary around brand assets, production configuration, internal strategy, and personal information.

Until such a release exists, the landing page should continue to make no open-source claim.

## Why openness fits Lymi

Lymi's strongest promise is not a secret algorithm. Spaced repetition, AI enrichment, APIs, and MCP are already available in the market. The more distinctive product is the combination of trusted capture, visible provenance, personal context, calm practice, language-pair quality, and a carefully made everyday experience.

Publishing the code could reinforce that product in several ways:

- **Trust.** People could inspect how private learning material is stored and when it is sent to AI or speech providers.
- **Continuity.** A usable self-hosted path would reduce concern that learning history could disappear with a hosted service.
- **Portability.** Open code would complement imports, exports, API access, and MCP rather than making Lymi the only place where learning can happen.
- **Developer distribution.** Public schemas, API examples, and integration code would be easier to discover, test, and extend.
- **External scrutiny.** More people could find security, accessibility, interoperability, and correctness problems.
- **Contributions.** Some users may improve integrations, language support, importers, or self-hosting instructions that matter to them.

These benefits are plausible rather than guaranteed. Mainstream learners are more likely to choose Lymi because it is pleasant, trustworthy, reliable, and easy to leave than because the repository is public. Contributions also create review and support work before they save maintainer time.

## Competitive trade-offs

| Area | Likely effect for Lymi | Why |
| --- | --- | --- |
| Private-first trust | Strong advantage | The data-handling promise becomes inspectable |
| API and MCP adoption | Moderate advantage | Developers and AI-tool users can understand and extend the system |
| Consumer acquisition | Small advantage | Most learners will not choose through GitHub |
| Community contribution | Small initially | A young consumer product may attract more users than maintainers |
| Copying and hosted clones | Moderate disadvantage | The client and server currently form one deployable application |
| Maintenance and support | Meaningful disadvantage | Issues, upgrades, security reports, and self-hosting require ownership |
| Monetization | Manageable | The hosted service can sell convenience and ongoing operation rather than code access |

The source code is therefore unlikely to be a durable competitive advantage by itself. The potential advantage comes from what openness makes possible: greater trust, integration-led distribution, a community, and a faster or safer development loop. Those effects could compound, but only if the project is actively maintained and the hosted experience remains the easiest way to use Lymi.

## Free tooling for open-source projects

Public open-source repositories can receive useful commercial development tools for free. This is a real operating benefit, especially for a small project using agent-assisted development, but it is not unique to Lymi and should not drive the decision alone.

Current examples include:

| Tool | Open-source benefit | Important limit |
| --- | --- | --- |
| GitHub Actions | Standard hosted runners are free for public repositories | Larger runners and storage can still cost money |
| GitHub security | Code scanning and secret scanning are available free for public repositories | They still require configuration and response ownership |
| CodeRabbit | Public open-source repositories receive automated review features without a paid subscription | OSS reviews have a separate rate-limit tier; some usage-based products remain paid |
| Qodo | Qualified open-source projects can apply for free access | Approval is required |
| Codecov | Public repositories receive unlimited coverage uploads on the open-source plan | Some team and advanced capabilities remain paid |
| SonarQube Cloud | Its OSS plan supports unlimited public repositories | It does not include private projects in the same plan |

For Lymi, the useful initial set would likely be free GitHub CI, CodeQL, secret scanning, one automated reviewer, and coverage reporting. Installing several overlapping review tools would create noise and grant more third parties access to repository metadata without a clear benefit.

The direct financial saving may be modest at first. The current test suite probably fits inside GitHub's private-repository allowance already. Cloudflare usage, the domain, AI and speech providers, email, and production operations also do not become free merely because the code is open source.

Vendor programs can change. Some require only a public repository, while others require an OSI-approved license, an application, community activity, or usage below a limit. A source-available license that restricts commercial use may not qualify.

## Licensing paths to consider

### Full application under AGPL-3.0

This is the strongest fit if self-hosting and inspectability become part of the product promise. Operators that modify Lymi and offer the modified application over a network would need to offer the corresponding source to their users.

AGPL does not prohibit commercial use. A competitor could legally run and sell a compliant, rebranded fork. The protection is that its modifications cannot remain proprietary, not that competition becomes impossible. Strong copyleft may also deter some companies from embedding Lymi code in their own products.

### Public core and integrations under Apache-2.0

Another path would publish `packages/core`, schemas, clients, importers, or MCP integration code under a permissive license while keeping the complete hosted application private.

This could maximize adoption and contribution around integrations. It would provide less evidence for the privacy claims of the running server and would allow proprietary forks of the published code. The current monorepo would also need a clear technical and licensing boundary rather than an ambiguous partial release.

### Source available

If code visibility matters but competing hosted services are unacceptable, a source-available license could impose commercial restrictions. That should not be described as open source because open-source licenses must allow commercial use and use in any field.

### Remain private

Keeping the application private remains valid if public maintenance would distract from proving the product or if the intended business depends on exclusive control of the code. Imports, exports, public API documentation, MCP, an audit trail, and clear privacy documentation can still create meaningful openness at the product boundary.

## Brand, contributions, and future licensing

The software license should not accidentally license the Lymi name, lantern identity, or other brand assets for competing products. A public release would need a clear trademark and brand-use policy, plus explicit treatment of bundled fonts, documentation, and artwork.

Contribution terms should be chosen before accepting outside code:

- A Developer Certificate of Origin can confirm that contributors have the right to submit their work while preserving distributed ownership.
- A contributor license agreement can preserve the option to dual-license later, but adds process and may discourage some contributors.
- If commercial dual licensing is a realistic future path, accepting contributions without sufficient relicensing rights could make that path difficult.

This deserves legal review before a license is selected. Public visibility alone is not a license; without an explicit license, ordinary copyright restrictions remain in force.

## What should remain private

An open-source codebase does not require publishing everything used to operate the company or product. Likely private material includes:

- credentials, environment files, production identifiers, and account configuration;
- raw customer or learner data and realistic fixtures derived from it;
- customer research, pricing strategy, acquisition plans, and sensitive roadmap material;
- vulnerability details while a coordinated fix is still in progress;
- operational incident material that contains personal or security-sensitive information;
- the protected Lymi name and brand assets, except for narrowly documented permitted uses.

Product principles, architecture, ADRs, public roadmap items, setup instructions, and contributor guidance could remain public when they help people understand or improve the software.

## Current repository publication gaps

The repository should not be made public in its present state. A preliminary audit found:

- GitHub currently reports the repository as private with no detected license.
- The root package is marked private and has no software-license field or root license file.
- The remote default branch has CI but no contribution guide, security policy, Code of Conduct, trademark policy, or support policy.
- Production Wrangler configuration contains personal allowlisted email addresses and Cloudflare resource identifiers that should be separated from a public deployment template.
- Product documents and Git metadata contain personal names and email addresses that should be reviewed intentionally.
- The repository has multiple remote branches and existing history. Making it public would expose branch contents, commit history, pull-request material, and GitHub Actions logs.
- A full-history Gitleaks scan found one candidate in an illustrative API-key example. It appears to be documentation rather than a real credential, but a public scan should be clean or carry a narrow, reviewed suppression.
- The working directory contains ignored development secrets and local Wrangler state. These are not tracked, but a release must be built from audited Git content rather than a copied working directory.
- The current checkout is behind the remote default branch and contains extensive uncommitted work, so it is not a safe release snapshot.
- A complete third-party dependency and asset license inventory is still pending.

Because the repository is young, a clean public repository created from an audited snapshot may be safer than changing the visibility of the current private repository. If Lymi makes that transition, the public repository should become canonical or have an explicit, reliable release process. A stale transparency mirror would weaken the trust argument.

## Release gate

Before any public release, verify:

### Strategy and legal

- the reason for opening the code and the intended audience;
- whether self-hosting is a supported product promise;
- the software, documentation, font, artwork, and trademark licenses;
- whether future dual licensing matters and what contributor terms support it;
- that every included asset and dependency can be redistributed under the chosen boundary.

### Repository and privacy

- every branch, tag, commit, pull request, issue, discussion, workflow log, and artifact;
- secret scanning across both tracked history and the release tree;
- removal or rotation of any genuine credentials before history cleanup;
- removal of personal data, private strategy, and unnecessary production identifiers;
- example configuration that cannot target Lymi's production resources accidentally.

### Security and operations

- a threat model and security review for auth, OAuth, API keys, MCP, D1 tenancy, background AI work, remote fetches, push notifications, and cost-abuse paths;
- minimal GitHub Actions permissions and safe handling of pull requests from forks;
- dependency updates, vulnerability reporting, and a private disclosure path;
- a fresh-clone build, test, migration, backup, restore, and upgrade path;
- clear AI-provider requirements, self-hosted cost ownership, and optional bring-your-own-key behavior where appropriate.

### Community

- `README`, `LICENSE`, `CONTRIBUTING`, `SECURITY`, Code of Conduct, support, and trademark documentation;
- issue and pull-request templates with an explicit scope for accepted contributions;
- a statement of maintainer capacity and no implied service-level commitment;
- release tags and a way to identify which public revision is running on the hosted service.

## Evidence that would justify proceeding

The case for opening Lymi becomes stronger if several of these are true:

- prospective users say inspectability, self-hosting, or continuity changes their trust;
- API or MCP users want to build and maintain integrations;
- outside contributors already have specific useful changes to make;
- free review, security, CI, or coverage tools materially improve the development loop;
- the hosted service remains clearly easier and more reliable than self-hosting;
- maintainer time is available for public issues, reviews, releases, and security response;
- Lymi's differentiation is increasingly grounded in product craft, language quality, operations, brand, and distribution rather than code secrecy.

## Questions to answer before deciding

1. Is self-hosting part of Lymi's promise, or is source visibility enough?
2. Is the primary goal trust, contributions, developer distribution, lower tooling cost, or some combination of them?
3. Would the complete app be public, or only a coherent core and integration surface?
4. Is commercial use by a compliant competing service acceptable?
5. Is AGPL adoption friction worth stronger network copyleft?
6. Should Lymi preserve a future commercial dual-license option?
7. Which product and strategy documents belong in the public project?
8. How much maintainer time can be committed to issues, pull requests, releases, and self-hosting support?
9. What evidence from beta users would show that openness improves trust or adoption?
10. At what product milestone would a public release help more than it distracts?

## Sources checked

- [The Open Source Definition](https://opensource.org/osd)
- [GitHub: licensing a repository](https://docs.github.com/en/enterprise-cloud@latest/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub: consequences of changing repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub: removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GNU AGPL-3.0](https://choosealicense.com/licenses/agpl-3.0/)
- [Apache-2.0](https://choosealicense.com/licenses/apache-2.0/)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features)
- [CodeRabbit plans](https://docs.coderabbit.ai/management/plans)
- [Qodo pricing and open-source program](https://www.qodo.ai/pricing/)
- [Codecov pricing](https://about.codecov.io/pricing/)
- [SonarQube Cloud subscription plans](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/managing-subscription/subscription-plans)
