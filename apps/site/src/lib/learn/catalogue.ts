import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { type Locale, localizedPath } from "../routes";

interface LessonBase {
  /** The topic in plain words, as people search for it: the lesson's name in lists and links. */
  name: MessageDescriptor;
  /** An Estonian phrase from the lesson, the same in every locale, shown beside the name. */
  et: string;
}

/** A built lesson: its slug is also its path, and its title leads its page and search result. */
export interface BuiltLesson extends LessonBase {
  slug: string;
  /** The heading and search title, with “Estonian” in it, such as “Estonian pronunciation”. */
  title: MessageDescriptor;
  minutes: number;
  /** The description for search and link previews. */
  blurb: MessageDescriptor;
}

/** A lesson that is planned but not built. */
export interface PlannedLesson extends LessonBase {
  slug?: undefined;
  title?: undefined;
  minutes?: undefined;
  blurb?: undefined;
}

export type Lesson = BuiltLesson | PlannedLesson;

export interface Stage {
  name: MessageDescriptor;
  level: "A1" | "A2" | "B1";
  /** The hue of the stage's trays and marks. */
  hue: number;
  goal: MessageDescriptor;
  lessons: readonly Lesson[];
}

/** The course in order. docs/design/estonian-lessons.md explains the order. */
export const STAGES: readonly Stage[] = [
  {
    name: msg`The basics`,
    level: "A1",
    hue: 222,
    goal: msg`Say who you are, what you do and where you live, and ask and answer. Then count, tell the time, name the day and tell people what to do.`,
    lessons: [
      {
        slug: "haaldus",
        name: msg`Pronunciation`,
        title: msg`Estonian pronunciation`,
        et: "Hääldus",
        minutes: 15,
        blurb: msg`A free Estonian pronunciation lesson: the nine vowels with õ, ä, ö and ü, stress, usually on the first syllable, and how a double letter can change a word. Every word is read aloud.`,
      },
      {
        slug: "mina-sina-tema",
        name: msg`Personal pronouns and “to be”`,
        title: msg`Estonian personal pronouns and “to be”`,
        et: "Mina, sina, tema",
        minutes: 15,
        blurb: msg`A free Estonian lesson on personal pronouns: mina, sina, tema and the rest in their long and short forms, and the verb olema, to be. Every sentence is read aloud.`,
      },
      {
        slug: "olevik",
        name: msg`Present tense`,
        title: msg`Estonian present tense`,
        et: "Ma loen",
        minutes: 15,
        blurb: msg`A free lesson on Estonian verbs in the present tense: the -ma infinitive, the stem, and the six endings -n, -d, -b, -me, -te and -vad on ten everyday verbs. Every sentence is read aloud.`,
      },
      {
        slug: "eitus",
        name: msg`Negation`,
        title: msg`How to say no in Estonian`,
        et: "Ei ole",
        minutes: 15,
        blurb: msg`A free lesson on Estonian negation in the present tense: ei before the verb, the same for every person, ei ole and pole, and how to answer a question with no. Every sentence is read aloud.`,
      },
      {
        slug: "kusimused",
        name: msg`Questions`,
        title: msg`Asking questions in Estonian`,
        et: "Kas? Mis? Kus?",
        minutes: 15,
        blurb: msg`A free lesson on Estonian questions: kas for yes or no, answers with jah and ei, the question words kes, mis, kus, millal, miks, kuidas and kui palju, and three everyday questions to learn whole. Every sentence is read aloud.`,
      },
      {
        slug: "kohad",
        name: msg`Saying where: -s and -l`,
        title: msg`In, on and at in Estonian: -s and -l`,
        et: "Tallinnas, Tartus",
        minutes: 15,
        blurb: msg`A free lesson on saying where you are in Estonian: -s, usually for in (Tallinnas, koolis), -l, usually for on and at (laual, tööl), which places take which, and how to answer kus, “where”. Every sentence is read aloud.`,
      },
      {
        slug: "tutvumine",
        name: msg`Practice: meeting someone`,
        title: msg`Estonian conversation practice: meeting someone`,
        et: "Tere! Mina olen Mari.",
        minutes: 20,
        blurb: msg`Free Estonian conversation practice for beginners: say your name, where you’re from, where you live and work, answer yes-or-no questions, ask your own and write a short message. Every conversation and passage is read aloud.`,
      },
      {
        slug: "numbrid",
        name: msg`Numbers`,
        title: msg`Estonian numbers`,
        et: "Üks, kaks, kolm",
        minutes: 15,
        blurb: msg`A free lesson on Estonian numbers: zero to ten, -teist and -kümmend, hundreds and thousands, numbers that sound alike, writing numbers in words, and numbers heard in prices, ages and phone numbers. Every number is read aloud.`,
      },
      {
        slug: "kell",
        name: msg`Telling the time`,
        title: msg`Telling the time in Estonian`,
        et: "Mis kell on?",
        minutes: 18,
        blurb: msg`A free Estonian lesson on telling the time: full hours, pool, veerand and kolmveerand, which name the hour that’s coming, minutes past and to, and writing the time in words. Every time is read aloud.`,
      },
      {
        slug: "paevad",
        name: msg`Days of the week`,
        title: msg`Days of the week in Estonian`,
        et: "Esmaspäev, teisipäev",
        minutes: 15,
        blurb: msg`A free lesson on the Estonian days of the week: the seven names, the four with numbers in them, the one-letter days on opening hours, täna, homme and eile, saying and writing what day it is, and a short passage to listen to. Every sentence is read aloud.`,
      },
      {
        slug: "kaskiv",
        name: msg`Commands`,
        title: msg`Estonian imperative: giving commands`,
        et: "Istu! Ära istu!",
        minutes: 15,
        blurb: msg`A free lesson on the Estonian imperative: the verb’s stem as a command (loe!, istu!, tule siia!), ära for don’t, the -ge and -ke forms for more than one person or polite you, everyday commands such as räägi aeglasemalt, palun, and a short conversation at a café. Every sentence is read aloud.`,
      },
      {
        slug: "paev-tallinnas",
        name: msg`Practice: a day in Tallinn`,
        title: msg`Estonian reading and listening practice: a day in Tallinn`,
        et: "Päev Tallinnas",
        minutes: 20,
        blurb: msg`Free Estonian practice for beginners: read opening hours and a message, sort times, prices and days, follow a voice message and a phone call with times and days, write what you hear, write short sentences in Estonian, fill in a plan for Saturday, talk with a friend at a café and write back. Every sentence is read aloud.`,
      },
      {
        slug: "pere-ja-ankeet",
        name: msg`Family and a form`,
        title: msg`Estonian family words and filling in a form`,
        et: "Pere ja ankeet",
        minutes: 25,
        blurb: msg`A free Estonian lesson for beginners: family words (ema, isa, vend, õde, laps), saying how many brothers, sisters and children you have, and the words on a registration form: first name, surname, address, phone number, age, birthday, country and town. Read a form, follow a conversation at a desk, fill in a form and write about yourself. Every sentence is read aloud.`,
      },
    ],
  },
  {
    name: msg`Nouns and cases`,
    level: "A1",
    hue: 160,
    goal: msg`Own things, count them and put them somewhere. Stems change first, then the genitive, which most other cases build on.`,
    lessons: [
      {
        slug: "pood-poe",
        name: msg`Stem changes`,
        title: msg`Estonian noun stems`,
        et: "Pood, poe",
        minutes: 10,
        blurb: msg`A free lesson on Estonian noun stems: why pood becomes poes and tuba becomes toas, words that add a vowel (koolis, raamatus), words that stay the same (kodus), and how a dictionary shows the stem. Every sentence is read aloud.`,
      },
      {
        slug: "pohivormid",
        name: msg`The three forms of a noun`,
        title: msg`The three forms of an Estonian noun`,
        et: "Kolm põhivormi",
        minutes: 12,
        blurb: msg`A free Estonian lesson on a noun’s three main forms, põhivormid (kool, kooli, kooli; pood, poe, poodi): how a dictionary and Sõnaveeb list them, and how most words in -ne and -us, and one-syllable words ending in a long vowel, show the partitive. Every word is read aloud.`,
      },
      {
        slug: "omastav",
        name: msg`The genitive case`,
        title: msg`The Estonian genitive case: my, your and whose`,
        et: "Minu raamat",
        minutes: 12,
        blurb: msg`A free lesson on the Estonian genitive case: minu, sinu, tema, meie, teie and nende for my, your, his or her, our and their, the owner before the noun (Mari raamat), kelle for whose, and the genitive as the form that takes -s and -l (kooli, koolis). Every sentence is read aloud.`,
      },
      {
        slug: "mul-on",
        name: msg`“To have”`,
        title: msg`How to say “I have” in Estonian`,
        et: "Mul on",
        minutes: 12,
        blurb: msg`A free lesson on saying “I have” in Estonian: mul, sul, tal, meil, teil and neil on, names with -l such as Maril on, the question kellel on?, mul on vaja for I need, and how to answer with jah, on or ei ole. Every sentence is read aloud.`,
      },
      {
        slug: "osastav",
        name: msg`The partitive case`,
        title: msg`The Estonian partitive case: after numbers, amounts and negation`,
        et: "Kaks kassi",
        minutes: 16,
        blurb: msg`A free lesson on the Estonian partitive case: after numbers from two up (kaks kassi, viis eurot), after mitu and amounts (tass kohvi), after pole (mul pole kassi) and with food and drink (ma joon kohvi). Every sentence is read aloud.`,
      },
      {
        slug: "mitmus",
        name: msg`Plural`,
        title: msg`Estonian plural`,
        et: "Kassid",
        minutes: 12,
        blurb: msg`A free lesson on the Estonian plural: the genitive plus -d (kassid, raamatud), the stem change it keeps (poed, toad, mehed), the verb with a plural noun (lapsed loevad), and adjectives in the plural (suured majad). Every sentence is read aloud.`,
      },
      {
        slug: "majas-majja-majast",
        name: msg`In, into, out of`,
        title: msg`Into and out of in Estonian: -sse and -st`,
        et: "Majas, majja, majast",
        minutes: 10,
        blurb: msg`A free lesson on Estonian’s three “inside” cases, the inessive, illative and elative: kus, kuhu and kust, -s for in, -sse for into (Tartusse) and -st for out of (koolist), the short forms kooli, poodi and koju, and how to say where you’re from. Every sentence is read aloud.`,
      },
      {
        slug: "laual-lauale-laualt",
        name: msg`On, onto, off`,
        title: msg`Onto and off in Estonian: -le and -lt`,
        et: "Laual, lauale, laualt",
        minutes: 10,
        blurb: msg`A free lesson on Estonian’s three “on” cases, the adessive, allative and ablative: kus, kuhu and kust, -l for on and at (laual, tööl), -le for onto and to (lauale, tööle) and -lt for off and from (laualt, töölt), which places take -le and which -sse, and -le and -lt on a person (emale, emalt). Every sentence is read aloud.`,
      },
      {
        slug: "peal-all-taga",
        name: msg`Place words: on, under, behind`,
        title: msg`Estonian postpositions: on, under, behind`,
        et: "Kass ja kast",
        minutes: 22,
        blurb: msg`A free lesson on Estonian postpositions of place: peal, all, taga, ees, kõrval and sees (on, under, behind, in front of, next to, inside), the genitive before them (laua peal, poe ees), their kuhu and kust forms (peale, pealt; taha, tagant; sisse, seest) and juures for a person’s place. Every sentence is read aloud.`,
      },
    ],
  },
  {
    name: msg`Verbs`,
    level: "A2",
    hue: 72,
    goal: msg`Say what you can, must and like to do, where you are going, what you did yesterday and what you will do tomorrow.`,
    lessons: [
      {
        slug: "verbi-pohivormid",
        name: msg`The three forms of a verb`,
        title: msg`The three forms of an Estonian verb`,
        et: "Lugema, lugeda, loen",
        minutes: 12,
        blurb: msg`A free lesson on the three forms of an Estonian verb, lugema, lugeda and loen: how the -da infinitive is made with -da, -ta, -la, -na or -a, including teha, näha, süüa and juua, and the -ge and -ke commands built on it. Every word and sentence is read aloud.`,
      },
      {
        slug: "tegevusnimed",
        name: msg`Infinitives after other verbs`,
        title: msg`Estonian infinitives after other verbs`,
        et: "Pean minema, tahan lugeda",
        minutes: 12,
        blurb: msg`A free lesson on which Estonian verbs take the -da infinitive after them and which take the -ma infinitive: tahan lugeda but pean lugema, with võin, saan, oskan, tohin, proovin, armastan and mulle meeldib on one side and hakkan, lähen, tule and jään on the other. Every sentence is read aloud.`,
      },
      {
        slug: "modaalverbid",
        name: msg`Can, may, must`,
        title: msg`Estonian modal verbs: can, may, must`,
        et: "Võin, saan, oskan",
        minutes: 12,
        blurb: msg`A free lesson on Estonian modal verbs: oskan for what you know how to do, saan for what nothing stops you doing, võin and tohin for what is allowed, pean, tuleb and mul on vaja for what you have to do, and how to say can’t, mustn’t and don’t have to. Every sentence is read aloud.`,
      },
      {
        slug: "ujuma-ujumas-ujumast",
        name: msg`Going, being, coming back: -ma, -mas, -mast`,
        title: msg`Estonian -ma, -mas and -mast: going, being and coming back`,
        et: "Lähen ujuma, olen ujumas",
        minutes: 12,
        blurb: msg`A free lesson on the Estonian -ma, -mas and -mast forms: lähen ujuma (going swimming), olen ujumas (out swimming) and tulen ujumast (back from swimming). They answer kuhu?, kus? and kust? as places do. Also when to say lähen, käin or tulen. Every sentence is read aloud.`,
      },
      {
        slug: "meeldima",
        name: msg`“To like” and feelings`,
        title: msg`How to say “I like” in Estonian`,
        et: "Mulle meeldib",
        minutes: 20,
        blurb: msg`A free Estonian lesson on meeldima, “to like”: mulle meeldib and the other persons, meeldivad for more than one thing, meeldib with a verb, ei meeldi, liking against wanting (mulle meeldib lugeda, ma tahan lugeda), questions with kas and kellele, and feelings such as mul on külm. Write sentences, fix the mistakes learners make, and follow a conversation and a message. Every sentence is read aloud.`,
      },
      {
        slug: "turul",
        name: msg`Practice: at the market`,
        title: msg`Estonian practice: shopping at the market`,
        et: "Turul",
        minutes: 15,
        blurb: msg`Free Estonian practice at the market: read a friend’s message and answer it, say what you need and what it costs (kilo juustu, kaks eurot), choose between the -da and -ma infinitive after tahan and pean, fix the mistakes learners make, buy cheese at a stall and follow a conversation heard twice. Every sentence is read aloud.`,
      },
      {
        slug: "lihtminevik",
        name: msg`Past tense`,
        title: msg`Estonian past tense`,
        et: "Lihtminevik",
        minutes: 14,
        blurb: msg`A free lesson on the Estonian past tense (lihtminevik): -si- on most verbs (elasin, lugesin, rääkisin), -i- on a few everyday ones (olin, läksin, sõin), the endings that say who did it, and eile and eelmisel nädalal. Every sentence is read aloud.`,
      },
      {
        slug: "mineviku-eitus",
        name: msg`Saying no in the past`,
        title: msg`How to say no in the past in Estonian`,
        et: "Ma ei läinud",
        minutes: 15,
        blurb: msg`A free lesson on saying no in the Estonian past tense: ei and the -nud form (ma ei läinud, ei olnud, polnud), the same for every person, how the -nud form comes from the -da infinitive, the five forms to learn whole, and answering a question with no. Every sentence is read aloud.`,
      },
      {
        slug: "tulevik",
        name: msg`The future`,
        title: msg`Estonian future tense: how to say “will”`,
        et: "Hakkan õppima",
        minutes: 15,
        blurb: msg`A free lesson on the future in Estonian, which has no future tense: the present with a time word (homme lähen Tartusse), hakkama with the -ma infinitive for something that will start (hakkan õppima), kavatsen and plaanin with the -da infinitive for plans, and what saab olema means. Every sentence is read aloud.`,
      },
      {
        slug: "nadalavahetusel",
        name: msg`Practice: last weekend, next week`,
        title: msg`Estonian practice: last weekend and next week`,
        et: "Nädalavahetusel",
        minutes: 15,
        blurb: msg`Free Estonian practice in the past and the future: read about a friend’s weekend and write back, say what you did and didn’t do (olin, ei läinud), what you will do (homme lähen, hakkan õppima, kavatsen tulla), fix verbs in the wrong form, and follow a conversation you can play twice. Every sentence is read aloud.`,
      },
    ],
  },
  {
    name: msg`More cases`,
    level: "A2",
    hue: 330,
    goal: msg`Say with whom and without what, give a date and a time, put words in the right order, describe and compare things, and say what someone became.`,
    lessons: [
      {
        slug: "sobraga-rahata",
        name: msg`With, without, until, as`,
        title: msg`With, without, until and as in Estonian`,
        et: "Sõbraga, rahata",
        minutes: 22,
        blurb: msg`A free Estonian lesson on four case endings: -ga for with and by (sõbraga, bussiga), -ta for without (piimata), -ni for until and as far as (kella viieni, Tartuni) and -na for as (arstina), each on the genitive, with sentences to write and fix and a phone call to follow. Every sentence is read aloud.`,
      },
      {
        slug: "asesonad",
        name: msg`Pronouns in every case`,
        title: msg`Estonian personal pronouns in every case`,
        et: "Mind, mulle, minuga",
        minutes: 18,
        blurb: msg`A free Estonian lesson on personal pronouns in their cases: minuga and sinuta on the genitive, the short forms mulle, mul and mult, the partitive mind, sind, teda, and telling minu, mul and mind apart. Every sentence is read aloud.`,
      },
      {
        slug: "jargarvud",
        name: msg`Ordinals and dates`,
        title: msg`Estonian ordinal numbers and dates`,
        et: "Esimene, teine, kolmas",
        minutes: 20,
        blurb: msg`A free lesson on Estonian ordinal numbers and dates: esimene, teine, kolmas and how the rest are built from the genitive, the months, asking mis kuupäev täna on?, writing 21. november, and -l for on a date or a floor (viiendal mail, kolmandal korrusel). Every sentence is read aloud.`,
      },
      {
        slug: "millal",
        name: msg`Time expressions: when things happen`,
        title: msg`Estonian time expressions: when things happen`,
        et: "Esmaspäeval, aasta pärast",
        minutes: 18,
        blurb: msg`A free Estonian lesson on saying when: hommikul and suvel with -l, mais with -s, hommikuti for every morning, nädala pärast and nädal tagasi, pärast tööd, and from and until with -st and -ni. Every sentence is read aloud.`,
      },
      {
        slug: "sonajarg",
        name: msg`Word order: the verb usually comes second`,
        title: msg`Estonian word order: the verb usually comes second`,
        et: "Täna lähen ma",
        minutes: 16,
        blurb: msg`A free Estonian lesson on word order: the verb usually in second place (täna lähen ma), questions like kus sa elad?, two verbs with the second one usually last, and where ei goes. Every sentence is read aloud.`,
      },
      {
        slug: "omadussonad",
        name: msg`Adjective agreement`,
        title: msg`Estonian adjectives: agreeing with the noun`,
        et: "Suures majas",
        minutes: 16,
        blurb: msg`A free Estonian lesson on adjectives with nouns: suures majas and uut raamatut, where the adjective usually takes the noun’s case, suure autoga with -ga, -ta, -ni and -na, and suured majad in the plural. Every sentence is read aloud.`,
      },
      {
        slug: "vordlus",
        name: msg`Comparatives and superlatives`,
        title: msg`Estonian comparatives and superlatives`,
        et: "Suurem, kõige suurem",
        minutes: 18,
        blurb: msg`A free Estonian lesson on comparing: suurem and uuem built on the genitive, suurem kui Tartu and Tartust suurem, kõige suurem for the biggest, sama suur kui for as big as, and two odd ones, hea, parem, parim and väike, väiksem. Every sentence is read aloud.`,
      },
      {
        slug: "saav",
        name: msg`The translative case`,
        title: msg`The Estonian translative case: becoming, by and for`,
        et: "Arstiks",
        minutes: 18,
        blurb: msg`A free Estonian lesson on the translative case: -ks on the genitive for what someone becomes (Ta sai arstiks, Ma jäin haigeks), -na against -ks, reedeks for by Friday and nädalaks for a week, and heaks arstiks, where the adjective takes -ks too. Every sentence is read aloud.`,
      },
      {
        slug: "keegi",
        name: msg`Somebody, nobody: -gi and -ki`,
        title: msg`Estonian somebody and nobody: -gi and -ki`,
        et: "Keegi, mitte keegi",
        minutes: 18,
        blurb: msg`A free Estonian lesson on keegi, midagi, kuskil and kuhugi: question words with -gi or -ki for somebody and something, ei for nobody and nothing, mitte keegi on its own, and -gi or -ki on every case, as in kellelegi and kellestki, and which one to use. Every sentence is read aloud.`,
      },
      { name: msg`Particle verbs: up, out, away`, et: "Üles, välja, ära" },
      {
        slug: "korter",
        name: msg`Practice: looking for a flat`,
        title: msg`Estonian practice: looking for a flat`,
        et: "Korter",
        minutes: 25,
        blurb: msg`A free Estonian practice lesson on looking for a flat: read an advert, write to the owner, look round the flat, follow a call about two flats and write your own message. It practises floors and dates, -ga, -ta, -na and -ks, adjectives and comparing, keegi and particle verbs. Every sentence is read aloud.`,
      },
    ],
  },
  {
    name: msg`Harder grammar`,
    level: "A2",
    hue: 18,
    goal: msg`Words that change inside, the object’s case, and new tenses and moods. You know every word by now, so only the rule is new.`,
    lessons: [
      {
        slug: "jalg-jala",
        name: msg`Consonant gradation`,
        title: msg`Estonian consonant gradation`,
        et: "Jalg, jala",
        minutes: 20,
        blurb: msg`A free lesson on consonant gradation in Estonian: why jalg becomes jala and tuba becomes toa, which forms take the strong or the weak stem, the four usual ways a consonant weakens (kapp, kapi; pank, panga; pood, poe; lind, linnu), words that go the other way (mõte, mõtte), and the same change in verbs (lugema, loen). Every sentence is read aloud.`,
      },
      {
        slug: "raamatut-voi-raamatu",
        name: msg`The object: whole or part`,
        title: msg`Estonian total and partial object`,
        et: "Raamatut või raamatu",
        minutes: 20,
        blurb: msg`A free lesson on the Estonian object: the partitive for part of something, an action still going on, after ei and after verbs such as ootama and otsima on their own; and for a noun, usually the genitive for the whole thing done (Ma lugesin raamatu läbi) and the nominative in commands (Osta pilet!). Every sentence is read aloud.`,
      },
      {
        slug: "raamatuid-maju",
        name: msg`Plural partitive`,
        title: msg`Estonian plural partitive`,
        et: "Raamatuid, maju",
        minutes: 20,
        blurb: msg`A free lesson on the Estonian plural partitive, the partitive for more than one: palju raamatuid, poes on õunu, mul ei ole lapsi; its endings -id, -sid and a changed last vowel (raamatuid, autosid, maju, koole); and how it differs from kaks raamatut and the plural raamatud. Every sentence is read aloud.`,
      },
      {
        slug: "majades-inimestele",
        name: msg`Plural cases`,
        title: msg`Estonian plural cases`,
        et: "Majades, inimestele",
        minutes: 22,
        blurb: msg`A free lesson on the Estonian plural cases: build the plural genitive, usually from the partitive (majade, raamatute, inimeste), then add the endings you know: majades, inimestele, sõpradega. Every sentence is read aloud.`,
      },
      {
        slug: "olen-lugenud",
        name: msg`Perfect and pluperfect`,
        title: msg`Estonian perfect and pluperfect`,
        et: "Olen lugenud, olin lugenud",
        minutes: 22,
        blurb: msg`A free lesson on the Estonian perfect and pluperfect: the -nud form (lugenud, käinud, läinud), olen with it for what has happened (ma olen Tartus käinud), olin for what had happened before (oli juba läinud), and when to use the simple past instead (eile käisin Tartus). Every sentence is read aloud.`,
      },
      {
        slug: "laheksin",
        name: msg`Conditional mood`,
        title: msg`Estonian conditional mood`,
        et: "Läheksin",
        minutes: 22,
        blurb: msg`A free lesson on the Estonian conditional, the would form: -ks with the person endings (ma läheksin, sa läheksid, ta läheks), ei läheks for every person, polite requests (ma tahaksin kohvi, kas sa saaksid aidata?) and if clauses (kui mul oleks aega, läheksin kinno). Every sentence is read aloud.`,
      },
      {
        slug: "lahme-las",
        name: msg`Let’s and let them`,
        title: msg`Let’s and let them in Estonian`,
        et: "Lähme! Las ta tuleb.",
        minutes: 20,
        blurb: msg`A free lesson on suggesting and allowing in Estonian: let’s, usually the present’s me form without me (teeme, vaatame; minema gives lähme), lähme with the -ma infinitive (lähme ujuma), and las, usually with the present (las ta tuleb, las ma aitan). Every sentence is read aloud.`,
      },
      {
        slug: "raagitakse",
        name: msg`Impersonal voice`,
        title: msg`Estonian impersonal voice`,
        et: "Räägitakse",
        minutes: 22,
        blurb: msg`A free lesson on the Estonian impersonal, for what people do with no person named: building it from the -tud form (räägitud, räägitakse, räägiti), the verbs to learn by heart (tehakse, süüakse, minnakse), saying no (ei räägita, ei räägitud) and the case of the object. Every sentence is read aloud.`,
      },
      {
        slug: "ootan-sind",
        name: msg`Which case a verb takes`,
        title: msg`Which case an Estonian verb takes`,
        et: "Ootan sind, räägin sinust",
        minutes: 22,
        blurb: msg`A free lesson on the case many Estonian verbs ask for: ootama keda (ootan sind), rääkima kellest (räägin sinust), helistama kellele (helistan sulle), kohtuma kellega (kohtun sinuga) and küsima kellelt (küsin sinult), where English and Estonian disagree. Every sentence is read aloud.`,
      },
      {
        slug: "kiri",
        name: msg`Practice: a message to the landlord`,
        title: msg`Estonian writing practice: a message to the landlord`,
        et: "Kiri",
        minutes: 25,
        blurb: msg`Free Estonian writing practice: read a message to a landlady, learn the phrases for a polite message (kas te saaksite, aitäh ette, lugupidamisega), follow a phone call about a cold radiator, then write your own message and compare it with a model. Every sentence is read aloud.`,
      },
    ],
  },
  {
    name: msg`Longer sentences`,
    level: "B1",
    hue: 280,
    goal: msg`Build new words from ones you know, read signs, news and forms, and join longer sentences.`,
    lessons: [
      {
        slug: "aru-saama",
        name: msg`Particle verbs with new meanings`,
        title: msg`Estonian particle verbs with new meanings`,
        et: "Aru saama",
        minutes: 24,
        blurb: msg`A free Estonian lesson on particle verbs whose meaning you can’t guess from their parts: aru saama, kokku saama, läbi saama, hakkama saama, otsa saama, maha jääma, ära jääma, välja nägema, ära tundma, vastu võtma, järele mõtlema and alla andma; the case each one usually takes, and where the particle goes. Every example is read aloud.`,
      },
      {
        slug: "labi-metsa",
        name: msg`Through, over, along`,
        title: msg`Through, across and along in Estonian`,
        et: "Läbi metsa, üle tee",
        minutes: 24,
        blurb: msg`A free Estonian lesson on five words for a way: läbi metsa (through), üle tee (across), mööda teed (along), järve ümber (around) and Riia kaudu (via); which take the genitive and which the partitive, and where each one goes. Every example is read aloud.`,
      },
      {
        slug: "opetaja-lugemine",
        name: msg`Words from verbs: -ja, -mine`,
        title: msg`Estonian nouns made from verbs`,
        et: "Õpetaja, lugemine",
        minutes: 24,
        blurb: msg`A free Estonian lesson on making nouns from verbs: -ja for the person who does it (õpetaja, müüja, lugeja; tegema gives tegija) and -mine for the doing (lugemine, ujumine, suitsetamine keelatud), how both change like any noun, and the case the verb around them asks for. Every example is read aloud.`,
      },
      {
        slug: "sobralik-kodutu",
        name: msg`Words from words: -lik, -tu, -ke`,
        title: msg`Making new Estonian words from nouns`,
        et: "Sõbralik, kodutu",
        minutes: 24,
        blurb: msg`A free Estonian lesson on three endings that make new words from nouns: -lik for adjectives that usually mean like it, having it or to do with it (sõbralik, ohtlik, kohalik, tervislik), -tu for without (kodutu, töötu, veatu) and -ke for a small one (majake, tükike, linnake), and how each new word changes in a sentence. Every example is read aloud.`,
      },
      {
        slug: "lugedes-lugemata",
        name: msg`The -des and -mata forms`,
        title: msg`Estonian -des and -mata forms: while and without`,
        et: "Lugedes, lugemata",
        minutes: 24,
        blurb: msg`A free Estonian lesson on two verb forms that look alike: -des for doing something, usually at the same time (lugedes, süües, minnes) and -mata for without doing it (lugemata, ütlemata, söömata), how to make each from the -da and -ma forms, the case of the object after -mata, and where the phrase goes in the sentence. Every sentence is read aloud.`,
      },
      {
        slug: "loetud-raamat",
        name: msg`Participles`,
        title: msg`Estonian participles used as adjectives`,
        et: "Loetud raamat",
        minutes: 26,
        blurb: msg`A free Estonian lesson on participles used as adjectives: -tud for what was done to it (loetud raamat, suletud uks, tehtud töö), -nud for what it did or became (väsinud mees, kukkunud leht) and -v for what it is doing now (jooksev vesi, magav laps), how to tell them apart, and which of them usually change with the noun. Every example is read aloud.`,
      },
      {
        slug: "et-sest-kui",
        name: msg`Conjunctions and word order`,
        title: msg`Estonian conjunctions and linking words`,
        et: "Et, sest, kui",
        minutes: 24,
        blurb: msg`A free Estonian lesson on joining clauses: et (that, so that), sest and kuna (because), kui (when, if) and nii et (so); how to tell a reason from a result, the comma that usually comes before the linking word, and where the verb usually goes after it. Every sentence is read aloud.`,
      },
      {
        slug: "raamat-mille-ostsin",
        name: msg`Relative clauses`,
        title: msg`Estonian relative clauses: who, which and where`,
        et: "Raamat, mille ostsin",
        minutes: 28,
        blurb: msg`A free Estonian lesson on relative clauses: mis, which usually follows a thing or an idea, and kes, which follows a person (raamat, mille ma ostsin; naine, kellega ma rääkisin), the case the word takes in its own clause (kelle, keda, mille, mida), kus for places, and the commas around the clause. Every sentence is read aloud.`,
      },
      {
        slug: "ta-olevat-haige",
        name: msg`Reported speech`,
        title: msg`Estonian reported speech and the -vat form`,
        et: "Ta olevat haige",
        minutes: 24,
        blurb: msg`A free Estonian lesson on reporting what someone said: ütles, et and rääkis, et for statements and küsis, kas for yes-or-no questions, how the person words change while the verb usually keeps its tense (Ta ütles, et tal on kiire), and the -vat form (Ta olevat haige, Ta ei tulevat), which is mostly met in news and reports and usually names no source. Every sentence is read aloud.`,
      },
      {
        slug: "uudised",
        name: msg`Practice: reading the news`,
        title: msg`Estonian B1 practice: reading and listening to the news`,
        et: "Uudised",
        minutes: 25,
        blurb: msg`Free Estonian B1 practice with news: read a local news story, tell stage 6 forms apart, fill a weather and traffic report, write and fix news sentences, follow a radio interview heard twice and write a short letter to the editor. Every sentence is read aloud.`,
      },
    ],
  },
];

/** A built lesson's page title in search results, before “· Lymi”. */
export const LESSON_PAGE_TITLE = msg({ message: "{title}: a free lesson with audio" });

/** A lesson with its number in the course, from 1, and its stage. */
export type PlacedLesson = Lesson & { n: number; stage: Stage };

export const LESSONS: readonly PlacedLesson[] = STAGES.flatMap((stage) => stage.lessons).map(
  (lesson, i) => ({
    ...lesson,
    n: i + 1,
    stage: STAGES.find((s) => s.lessons.includes(lesson)) as Stage,
  }),
);

/** The slugs of the lessons that are built, which `/estonian/learn/[lesson]` renders. */
export const LESSON_SLUGS = LESSONS.flatMap((lesson) => (lesson.slug ? [lesson.slug] : []));

export const lessonName = (slug: string) =>
  slug.replace(/(^|-)(\w)/g, (_, _dash, letter: string) => letter.toUpperCase());

export function lessonBySlug(slug: string): (PlacedLesson & BuiltLesson) | undefined {
  return LESSONS.find((lesson): lesson is PlacedLesson & BuiltLesson => lesson.slug === slug);
}

export function lessonPath(slug: string, locale: Locale | string): string {
  return `${localizedPath("learn", locale)}/${slug}`;
}

export const reviewPath = (locale: Locale | string) => localizedPath("learnReview", locale);

/** The built lesson before this one. */
export function previousLesson(slug: string): (PlacedLesson & BuiltLesson) | undefined {
  const i = LESSONS.findIndex((lesson) => lesson.slug === slug);
  const before = i > 0 ? LESSONS[i - 1] : undefined;
  return before?.slug ? (before as PlacedLesson & BuiltLesson) : undefined;
}

/** The lesson after this one, built or not. */
export function nextLesson(slug: string): PlacedLesson | undefined {
  const i = LESSONS.findIndex((lesson) => lesson.slug === slug);
  return i < 0 ? undefined : LESSONS[i + 1];
}
