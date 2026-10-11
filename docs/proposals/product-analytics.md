---
status: proposed
date: 2026-10-11
decision: "Prepare one-button account entry and client/server analytics; default-on browser collection remains pending an established ePrivacy basis."
---

# Product analytics foundation

Measure the visitor-to-first-review journey with one EU PostHog project, opaque identity and a typed event contract. Implemented producer meanings, privacy boundaries and extension rules live in [the instrumentation guide](../analytics.md); [the stack](../stack.md#analytics-workers-analytics-engine-and-posthog-eu) owns the architecture. This proposal does not authorize activating collection beyond those boundaries.

The requested experience is one account-creation action, no analytics checkbox or in-product banner, and client/server product events enabled after signup. The public site retains optional analytics. PostHog is disclosed in the Privacy Policy. Recordings remain outside this change. This supersedes the account-entry checkbox proposal; signup itself must not be recorded as analytics consent.

Delivery includes the event wishlist's implemented flows, compatibility for `review_graded` and legacy additions/import outcomes, internal account classification and instrumentation in the definition of done. CSV/Quizlet adapters and native mobile instrumentation are future extensions. Dashboard consumers must validate live production ingestion before building the activation funnel.

## Legal basis assessment

Assessment date: 11 October 2026. The proposed controller is Krambertech OÜ in Estonia, as named in Lymi’s Privacy Policy. The assessment covers account-linked product measurement and signup attribution for adult learners; it does not establish a basis for advertising, recordings, fingerprinting or processing children’s data. Processor terms, vendor retention and deletion handling have not been verified by this assessment; the adult-learner scope does not establish an age restriction at signup.

**Purpose.** The concrete interest is identifying where learners fail to reach their first useful review, which acquisition sources lead to sustained use, and which product changes improve that journey. Product improvement is an example of a potentially legitimate interest in the [EDPB’s legitimate-interest summary](https://www.edpb.europa.eu/system/files/2024-10/edpb_summary_202401_legitimateinterest_en.pdf). This identifies a candidate GDPR Article 6(1)(f) basis, not an exemption from other requirements.

**Necessity.** Fixed actions and counts can answer activation questions without emails, names, card content, prompts or full URLs. An opaque account ID supports matching committed server outcomes with browser interactions and measuring retention across days, but remains personal data. Aggregate/cohort measurement is a less intrusive alternative and must be considered before concluding that each account-linked event is necessary. The current wishlist alone does not prove that necessity.

**Balancing.** Clear disclosure, EU processing, property allowlists, internal-account filtering, disabled replay/autocapture, restricted access, limited retention and an accessible objection process would reduce intrusion. The assessment still needs verified retention, vendor/data-access arrangements, deletion and objection handling, and justification of individual journey tracking against less intrusive alternatives. A Privacy Policy sentence or user acceptance of Terms does not establish a positive balancing outcome. Estonia’s [AKI guidance](https://www.aki.ee/uudised/oigustatud-huvi-millal-ja-kuidas-sellele-andmetootluses-tugineda) requires a documented purpose, necessity and balancing assessment before relying on legitimate interests.

**Separate ePrivacy requirement.** The [EDPB’s final technical-scope guidelines](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf), paragraphs 33 and 35–39, cover instructed JavaScript transmission of stored information and storage in RAM, without a minimum persistence duration. Consequently, PostHog `persistence: "memory"`, disabling cookies/local storage, supplying an existing account ID or proxying events through Lymi does not by itself establish a consent exemption. A GDPR legitimate-interest assessment cannot substitute for an applicable ePrivacy exemption.

Estonia’s [AKI cookie guidance](https://www.aki.ee/isikuandmed/kkk/interneti-ja-veebitegevused) requires prior voluntary consent for additional analytics cookies. France’s [CNIL audience-measurement guidance](https://www.cnil.fr/fr/questions-reponses-lignes-directrices-modificatives-et-recommandation-cookies-traceurs) describes a narrower exemption for anonymous statistical measurement, without cross-site tracking or combination with other processing. That French exemption is not an Estonian approval, and the proposed account-linked, cross-domain journey does not demonstrate compliance with its stated limits.

**Conclusion.** A candidate GDPR basis exists for limited product-improvement processing, but this research does not establish a positive necessity/balancing result or an ePrivacy exemption for the requested default-on account-linked browser tracking. Activation remains blocked on a qualified assessment of that exact collection under the applicable law. Do not remove the consent gate, turn an absent preference into permission, label signup as consent, or overwrite an existing withdrawal to make the desired interface appear compliant. Preparation can continue independently; no default-on configuration is approved by this document.

The review question is whether Estonia’s ePrivacy implementation permits default-on, authenticated, first-party JavaScript events under a specific exception when PostHog persists no analytics cookies or browser storage, receives only fixed action metadata and an opaque account ID, and performs no replay, fingerprinting or advertising. The review must separately address joining those events to consented marketing attribution and the applicable GDPR balancing, retention, objection and deletion obligations. A negative answer requires reducing collection or obtaining separate voluntary permission; changing signup wording cannot resolve it.

## Signup attribution

The implemented `signed_up` contract carries `method`, `first_landing_page`, `referrer`, `utm_source`, `utm_medium` and `utm_campaign`. First-touch metadata is stored only after public analytics permission, then delivered on account creation with the same opaque account identity. Google and email share that producer. Referrers are reduced to external hostnames; campaign labels are bounded and private paths, search terms, names, emails, tokens, `utm_term` and `utm_content` are excluded.

A missing referrer does not prove a direct visit: privacy controls, applications and redirects can hide it. Reporting should describe unavailable attribution as unknown rather than infer a source. Declining public analytics prevents persistent first-touch linkage; signing up later does not grant permission retroactively. Default-on product measurement, if independently justified, would not recover that missing marketing journey.
