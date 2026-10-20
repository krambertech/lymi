---
status: exploration
date: 2026-10-20
decision: none
---

# Integration exam decks

A migrant in Europe meets the language through a permit: permanent residence and citizenship each ask for a language level and, in many countries, a test on laws and society. Lymi already publishes several citizenship and language exams on `/exams`, one page per exam from `apps/site/src/lib/exams.ts`, including Germany's Einbürgerungstest, Spain's CCSE, Czechia's tests and the Goethe-Zertifikat. This plan says which decks to publish next for the languages in [long-tail languages](long-tail-languages.md), from which official source and under what terms. It holds no content; Kateryna decides which to build.

## Evidence

Checked on each authority's own pages on 2026-10-20. Sites behind bot checks (udi.no, migri.fi, certyfikatpolski.pl, France Éducation international, Légifrance, the Italian prefectures) were read through official mirrors or search extracts and need a second look before a page states their facts.

| Country | Tests | What the authority publishes | Reuse terms |
| --- | --- | --- | --- |
| Denmark | Indfødsretsprøven: 45 questions, 36 to pass. Medborgerskabsprøven: 25, 20 to pass. Prøve i Dansk 2 or 3. | Both study books and every past test with its answer key ([danskogproever.dk](https://danskogproever.dk/borger/indfoedsretsproeve-statsborgerskab/forberedelse-til-indfoedsretsproeven/)) | None stated; Copyright Act § 9 frees official documents, untested for exam papers |
| France | Since 2026: A2, B1 or B2 by permit (TCF or DELF), and an examen civique: 40 questions, 32 to pass | The official knowledge-question lists, 191 and 209 questions, without options ([formation-civique.interieur.gouv.fr](https://formation-civique.interieur.gouv.fr/examen-civique/liste-officielle-des-questions-de-connaissance-csp/)) | Contradictory: Licence Ouverte 2.0 in the footer, reproduction forbidden in the legal notice |
| Germany | DTZ (A2–B1) by g.a.s.t. for BAMF; B1 and the Einbürgerungstest for citizenship | Two DTZ practice sets; a 2009 DTZ handbook with a word list | g.a.s.t.: unauthorised use forbidden; handbook © Cornelsen |
| Estonia | Estonian B1; the Constitution and Citizenship Act exam: 24 questions, 18 to pass ([Harno](https://harno.ee/en/citizenship-examinations)) | 17 sample items, an English handbook and a glossary | None stated |
| Latvia | Latvian test and a Satversme, anthem and history test ([PMLP](https://www.pmlp.gov.lv/en/examinations-determined-citizenship-law)); A2 for permanent residence | Sample tests and a self-check | All rights reserved |
| Lithuania | Category I Lithuanian (A2) and the Constitution exam: 20 questions, 14 to pass | The Constitution exam's topic list | Copyright notice only |
| Poland | B1 state certificate for citizenship and the EU long-term permit ([gov.pl](https://www.gov.pl/web/mswia/popros-o-uznanie-za-polskiego-obywatela)) | Sample tests and past papers; the regulation's topic and grammar inventories | None seen; Copyright Act art. 4 frees official documents |
| Netherlands | Inburgeringsexamen: A2 or B1 and KNM; or Staatsexamen NT2 | Two KNM practice exams; NT2 practice tasks | NT2 site CC0 except marked parts; Auteurswet art. 15b |
| Norway | Statsborgerprøven: 36 tasks, 24 to pass; samfunnskunnskapsprøven: 38, 26 to pass ([HK-dir](https://prove.hkdir.no/statsborgerprove/les-om-proven-statsborgerprove)); Norskprøven | Example tests; study texts at samfunnskunnskap.no | Study texts: digital copying forbidden |
| Sweden | Citizenship since 6 June 2026: B1 reading and listening, A2 speaking and writing, and a civics test by UHR; the Swedish test may start in 2029 | The study book *Sverige i fokus* and five sample questions ([UHR](https://www.uhr.se/medborgarskapsprovet/utbildningsmaterial/)) | None stated; upphovsrättslagen 9 § does not cover them |
| Finland | YKI level 3 for citizenship; a citizenship test from 1 March 2027 | No official YKI tasks; test materials due around the new year | © Opetushallitus |
| Iceland | Icelandic test at A2 for citizenship, no civics test ([island.is](https://island.is/islenskuprof-fyrir-rikisborgararett/upplysingar-um-profid)) | One sample test and the curriculum | None stated |
| Hungary | Constitutional basics exam for naturalisation, on nine topics set by decree | No question list | Copyright Act 1(4) frees legislation |
| Italy | B1 for citizenship (CILS, CELI, PLIDA, CERT.IT); an A2 test for the EU long-term permit | CILS B1 Cittadinanza sample exam with keys | All rights reserved |
| Portugal | A2 (CIPLE) for residence and citizenship; a civics test required by Organic Law 1/2026, not yet set up | CIPLE samples with a key ([CAPLE](https://caple.letras.ulisboa.pt/exame/2/ciple)) | None stated |

No authority grants a reuse licence for its exam questions; only the Dutch NT2 site is CC0, and France's terms contradict each other.

## Decks

Two kinds, as on `/exams` today: a **question deck** carries the authority's own questions with a translation beside each, as Germany's does; a **subject deck** is written by Lymi from public facts and law texts, cites its source, and says it is not the exam's questions, as the template's `note` allows.

1. **Denmark, both tests, question decks.** The past tests with answer keys are the closest thing to Germany's catalogue. Ask SIRI in writing first, since § 9 is untested for exam papers; leave out the book's photos.
2. **France, examen civique, question deck.** The official knowledge questions, French with English, once DIAN confirms the Licence Ouverte covers them; the answers are Lymi's own, since the lists have none.
3. **Estonia, Constitution exam, subject deck.** Lymi's own cards from the Constitution and the Citizenship Act; the 17 sample items are linked, not copied.
4. **Sweden, civics, subject deck** following *Sverige i fokus*'s chapters without its text.
5. **Latvia, Lithuania, Hungary, subject decks** from each constitution's text and the published topic lists; Latvia adds the anthem, whose text is in the public domain.
6. **Netherlands, Norway, subject decks** on the KNM and samfunnskunnskap topics.
7. **Language decks for Polish B1 and the DTZ**, written by Lymi from the regulation's topic inventory and the BAMF topics, not from the copyrighted word lists.
8. **Wait:** Finland and Portugal until their citizenship tests have materials; Iceland and Italy, whose tests are language-only and publish one sample each.

## Pages

Each deck gets an `EXAMS` entry: `group: "citizenship"` or `"language"`, the authority, the source and its edition, `facts` only where the authority's own page states them, and `note` for a subject deck. `/exams` and the language pages link to the decks; nothing claims to be official or promises a pass.

## Open questions

1. Which first? Leaning: Denmark, then France, then Estonia.
2. Does Lymi ask SIRI, DIAN, UHR and Harno for written permission before reusing anything, even where the law seems to allow it?
3. Should a subject deck carry the learner's language beside the exam's, as Germany's English column does?
4. Who checks each deck's facts in its language before it is published?
5. Are law texts free to reuse in Estonia, Latvia, Lithuania, Norway, Sweden and France, as in Denmark, Germany, Hungary, Italy and Poland? Not checked, and the subject decks quote them.
