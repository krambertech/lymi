---
status: exploration
date: 2026-10-20
decision: none
---

# Integration exam decks

A migrant in Europe meets the language through a permit: permanent residence and citizenship each ask for a language level and, in most countries, a test on the country's laws and society. Lymi already publishes Germany's, Czechia's and Spain's citizenship tests, among others, on `/exams`, one page per exam from `apps/site/src/lib/exams.ts`. This plan says which exam decks to publish next for the languages in [long-tail languages](long-tail-languages.md), from which official source, and under what terms. It holds no content. Kateryna decides which to build.

## Evidence

Checked against each authority's own pages on 2026-10-20, except udi.no and migri.fi, whose bot checks blocked a direct read; their facts come from search extracts and need a second look before a page states them.

| Country | Tests | What the authority publishes | Terms stated |
| --- | --- | --- | --- |
| Denmark | Indfødsretsprøven (citizenship): 45 questions, 36 to pass, 45 min. Medborgerskabsprøven (permanent residence): 25 questions, 20 to pass, 30 min. Plus Prøve i Dansk 2 or 3. | Both study books, and every past test with its answer key: indfødsretsprøven 2020 to June 2026, medborgerskabsprøven 2016 to June 2026 ([danskogproever.dk](https://danskogproever.dk/borger/indfoedsretsproeve-statsborgerskab/forberedelse-til-indfoedsretsproeven/)) | None. Copyright Act § 9 frees laws and "offentlige aktstykker"; whether exam papers count is untested. The book's photos are Ritzau Scanpix's. |
| Estonia | Estonian B1, and the exam on the Constitution and the Citizenship Act: 24 questions, 18 to pass, 45 min, in Estonian ([Harno](https://harno.ee/en/citizenship-examinations)) | 17 public sample items, an English handbook and an Estonian–English glossary for the Constitution exam; B1 sample tasks and a workbook | None. Sample performances are published with their authors' permission; B1 listening uses broadcast recordings. |
| Latvia | Naturalisation: Latvian test, and a test on the Satversme, the anthem and history, pass with 7/10 history, 5/8 Satversme, 1/2 anthem ([PMLP](https://www.pmlp.gov.lv/en/examinations-determined-citizenship-law)). Permanent residence: Latvian A2 (VIAA). | Sample tests for each part and an online self-check; VIAA sample papers A1 to C2 | "All rights reserved" on both sites |
| Netherlands | Inburgeringsexamen: A2 or B1 language parts, KNM (45 min), ONA for Wi2013; or Staatsexamen NT2 ([IND](https://ind.nl/en/dutch-citizenship/civic-integration-for-naturalisation)) | Two KNM practice exams and A2 practice parts ([inburgeren.nl](https://www.inburgeren.nl/examen-doen/oefenen.jsp)); NT2 practice tasks | inburgeren.nl: none. staatsexamensnt2.nl: CC0 1.0, except marked texts and most images. Auteurswet art. 15b lets government works be reused unless reserved, but keeps the collection right. |
| Norway | Statsborgerprøven: 36 tasks, 24 to pass, 60 min, in Norwegian. Samfunnskunnskapsprøven: 38 tasks, 26 to pass, 60 min, in 23 languages ([HK-dir](https://prove.hkdir.no/statsborgerprove/les-om-proven-statsborgerprove)). Oral Norwegian A2 or B1. | Online example tests; study texts at samfunnskunnskap.no | Study texts: Cappelen Damm, digital copying forbidden. Example tests: none. |
| Lithuania | State-language Category I (A2) and the Constitution exam: 20 questions, 14 to pass ([NŠA programme](https://www.nsa.smsm.lt/wp-content/uploads/2025/06/AR_2009-05-24-1.pdf)) | The Constitution exam's topic list; language samples behind a site under maintenance | Copyright notice, no licence |
| Finland | YKI intermediate (level 3) for citizenship. A citizenship test on law, rights, history and culture starts for applications from 1 March 2027. | No official YKI tasks. Migri says the citizenship test's learning materials come out around the turn of the year. | © Opetushallitus; Migri's terms not yet seen |

No authority publishes a word list the way the Goethe-Institut does, and none grants a reuse licence for its exam questions; only the Dutch NT2 site is CC0.

## Decks

Two kinds, as on `/exams` today: a **question deck** carries the authority's own questions with a translation beside each, as Germany's does; a **subject deck** is written by Lymi from public facts and law texts, cites the official source it follows, and says it is not the exam's questions, as the exam template's `note` already allows.

1. **Denmark, both tests, question decks.** The past tests with answer keys are the closest thing to Germany's catalogue: real questions, Danish with English, one deck per test, a new edition each June. Before publishing, ask SIRI in writing whether the past tests may be reused, since § 9 is untested for exam papers; leave out the book's photos.
2. **Estonia, Constitution exam, subject deck.** Lymi's own cards from the Constitution and the Citizenship Act, the terms a candidate must read in Estonian, with English. The 17 sample items stay on Harno's site and are linked, not copied.
3. **Latvia, naturalisation, subject deck.** The Satversme's articles and Lymi's own history cards, plus the anthem: its text is in the public domain. The sample tests are reserved, so they are linked.
4. **Netherlands, KNM, subject deck.** Lymi's own cards on the KNM topics, Dutch with English. The practice exams are linked; an NT2 deck may reuse the CC0 site's text where it is not marked.
5. **Norway, subject deck.** Lymi's own cards in Norwegian at A2, following the study texts' topics without their text.
6. **Lithuania, Constitution exam, subject deck.** Lymi's own cards on the topic list, from the Constitution's text.
7. **Finland: wait.** The citizenship test's materials are due around the new year; plan the deck once they and their terms are out.

A subject deck is slower to write than a question deck, but it carries no licence risk and can be corrected without waiting for an authority.

## Pages

Each deck gets an `EXAMS` entry: `group: "citizenship"`, the authority, the source and its edition, `facts` only where the authority's own page states them, and `note` for a subject deck. A language test with no official word list gets no page of its own. `/exams` and the language pages link to the decks; nothing claims to be official or promises a pass.

## Open questions

1. Which of the seven first? Leaning: Denmark, then Estonia.
2. Does Lymi ask SIRI, DUO and Harno for written permission before reusing anything they publish, even where the law seems to allow it?
3. Should a subject deck carry the exam's language only, or the learner's language too, as Germany's English column does?
4. Who checks each deck's facts in its language before it is published?
5. Are law texts free to reuse in Estonia, Latvia, Lithuania and Norway, as they are in Denmark and the Netherlands? This was not checked, and the subject decks quote them.
