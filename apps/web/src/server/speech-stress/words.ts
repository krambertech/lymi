/** A stressed form: the term with U+0301 after its stressed vowel, and the IPA a phoneme-aware voice reads. */
export type StressForm = { marked: string; gloss: string; ipa: string };

/** Forms that share one plain spelling, so a voice reading the plain term can be right for only one. */
export type StressItem = { language: "ru" | "uk"; forms: StressForm[] };

const ru = (...forms: StressForm[]): StressItem => ({ language: "ru", forms });
const uk = (...forms: StressForm[]): StressItem => ({ language: "uk", forms });

// The pairs open with those in docs/proposals/russian-and-ukrainian.md, Speech.
export const STRESS_ITEMS: StressItem[] = [
  ru(
    { marked: "за́мок", gloss: "castle", ipa: "ˈzamək" },
    { marked: "замо́к", gloss: "lock", ipa: "zɐˈmok" },
  ),
  ru(
    { marked: "му́ка", gloss: "torment", ipa: "ˈmukə" },
    { marked: "мука́", gloss: "flour", ipa: "mʊˈka" },
  ),
  ru(
    { marked: "пла́чу", gloss: "I cry", ipa: "ˈplat͡ɕʊ" },
    { marked: "плачу́", gloss: "I pay", ipa: "plɐˈt͡ɕu" },
  ),
  ru(
    { marked: "сто́ит", gloss: "it costs", ipa: "ˈstoɪt" },
    { marked: "стои́т", gloss: "it stands", ipa: "stɐˈit" },
  ),
  ru(
    { marked: "ду́хи", gloss: "spirits", ipa: "ˈduxʲɪ" },
    { marked: "духи́", gloss: "perfume", ipa: "dʊˈxʲi" },
  ),
  ru(
    { marked: "по́лки", gloss: "shelves", ipa: "ˈpolkʲɪ" },
    { marked: "полки́", gloss: "regiments", ipa: "pɐlˈkʲi" },
  ),
  ru(
    { marked: "а́тлас", gloss: "atlas", ipa: "ˈatləs" },
    { marked: "атла́с", gloss: "satin", ipa: "ɐtˈlas" },
  ),
  ru(
    { marked: "о́рган", gloss: "organ of the body", ipa: "ˈorɡən" },
    { marked: "орга́н", gloss: "pipe organ", ipa: "ɐrˈɡan" },
  ),
  ru(
    { marked: "и́рис", gloss: "iris", ipa: "ˈirʲɪs" },
    { marked: "ири́с", gloss: "toffee", ipa: "ɪˈrʲis" },
  ),
  ru(
    { marked: "хло́пок", gloss: "cotton", ipa: "ˈxlopək" },
    { marked: "хлопо́к", gloss: "clap", ipa: "xlɐˈpok" },
  ),
  ru(
    { marked: "па́рить", gloss: "to steam", ipa: "ˈparʲɪtʲ" },
    { marked: "пари́ть", gloss: "to soar", ipa: "pɐˈrʲitʲ" },
  ),
  ru(
    { marked: "бе́лки", gloss: "squirrels", ipa: "ˈbʲelkʲɪ" },
    { marked: "белки́", gloss: "proteins", ipa: "bʲɪlˈkʲi" },
  ),
  ru(
    { marked: "ви́на", gloss: "wines", ipa: "ˈvʲinə" },
    { marked: "вина́", gloss: "guilt", ipa: "vʲɪˈna" },
  ),
  ru(
    { marked: "кру́жки", gloss: "mugs", ipa: "ˈkruʂkʲɪ" },
    { marked: "кружки́", gloss: "clubs", ipa: "krʊʂˈkʲi" },
  ),
  ru(
    { marked: "ве́сти", gloss: "news", ipa: "ˈvʲesʲtʲɪ" },
    { marked: "вести́", gloss: "to lead", ipa: "vʲɪsʲˈtʲi" },
  ),
  ru(
    { marked: "со́рок", gloss: "forty", ipa: "ˈsorək" },
    { marked: "соро́к", gloss: "of magpies", ipa: "sɐˈrok" },
  ),
  ru(
    { marked: "у́же", gloss: "narrower", ipa: "ˈuʐɨ" },
    { marked: "уже́", gloss: "already", ipa: "ʊˈʐɛ" },
  ),
  ru(
    { marked: "мо́ю", gloss: "my (feminine accusative)", ipa: "ˈmoju" },
    { marked: "мою́", gloss: "I wash", ipa: "mɐˈju" },
  ),
  ru(
    { marked: "доро́га", gloss: "road", ipa: "dɐˈroɡə" },
    { marked: "дорога́", gloss: "dear (feminine)", ipa: "dərɐˈɡa" },
  ),
  ru(
    { marked: "за́сыпать", gloss: "to fill up", ipa: "ˈzasɨpətʲ" },
    { marked: "засыпа́ть", gloss: "to fall asleep", ipa: "zəsɨˈpatʲ" },
  ),
  uk(
    { marked: "за́мок", gloss: "castle", ipa: "ˈzɑmɔk" },
    { marked: "замо́к", gloss: "lock", ipa: "zɑˈmɔk" },
  ),
  uk(
    { marked: "бра́ти", gloss: "brothers", ipa: "ˈbrɑtɪ" },
    { marked: "брати́", gloss: "to take", ipa: "brɑˈtɪ" },
  ),
  uk(
    { marked: "доро́га", gloss: "road", ipa: "dɔˈrɔɦɑ" },
    { marked: "дорога́", gloss: "dear (feminine)", ipa: "dɔrɔˈɦɑ" },
  ),
  uk(
    { marked: "ви́кликати", gloss: "to summon (perfective)", ipa: "ˈʋɪklɪkɑtɪ" },
    { marked: "викли́кати", gloss: "to summon (imperfective)", ipa: "ʋɪˈklɪkɑtɪ" },
  ),
  uk(
    { marked: "ру́ки", gloss: "hands", ipa: "ˈrukɪ" },
    { marked: "руки́", gloss: "of a hand", ipa: "ruˈkɪ" },
  ),
  uk(
    { marked: "но́ги", gloss: "legs", ipa: "ˈnɔɦɪ" },
    { marked: "ноги́", gloss: "of a leg", ipa: "nɔˈɦɪ" },
  ),
  uk(
    { marked: "му́ка", gloss: "torment", ipa: "ˈmukɑ" },
    { marked: "мука́", gloss: "flour", ipa: "muˈkɑ" },
  ),
  uk(
    { marked: "а́тлас", gloss: "atlas", ipa: "ˈɑtlɑs" },
    { marked: "атла́с", gloss: "satin", ipa: "ɑtˈlɑs" },
  ),
  uk(
    { marked: "пла́чу", gloss: "I cry", ipa: "ˈplɑt͡ʃu" },
    { marked: "плачу́", gloss: "I pay", ipa: "plɑˈt͡ʃu" },
  ),
  uk(
    { marked: "о́рган", gloss: "organ of the body", ipa: "ˈɔrɦɑn" },
    { marked: "орга́н", gloss: "pipe organ", ipa: "ɔrˈɦɑn" },
  ),
  // Single words for и, і, ї, е and є, where a Russian accent shows even with the right stress.
  uk({ marked: "дити́на", gloss: "child", ipa: "dɪˈtɪnɑ" }),
  uk({ marked: "їжа́к", gloss: "hedgehog", ipa: "jiˈʒɑk" }),
  uk({ marked: "єди́ний", gloss: "the only", ipa: "jɛˈdɪnɪj" }),
  uk({ marked: "неді́ля", gloss: "Sunday", ipa: "nɛˈdʲilʲɑ" }),
];
