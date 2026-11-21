// Every word on the store screenshots, per language. Ukrainian and Russian are written from the English.
// `shots` holds each screenshot's headline (one <em> for the lit words) and the plain line under it, in order.
window.COPY = {
  en: {
    shots: [
      [
        "Learn anything.<br><em>Remember it.</em>",
        "Flashcards that come back right before you’d forget them.",
      ],
      [
        "Works with <em>your AI</em>",
        "Ask Claude, ChatGPT or any app that connects over MCP. The cards land in your decks.",
      ],
      [
        "Start with a <em>ready deck</em>",
        "27 languages, driving tests, citizenship tests, geography, science and more.",
      ],
      [
        "Snap a page, <em>get cards</em>",
        "Take a photo of your notes. Lymi finds the terms, you pick which to keep.",
      ],
      [
        "Learn <em>together</em>",
        "Share a deck with friends or a class. Everyone gets the new cards and studies at their own pace.",
      ],
      ["Hear<br><em>every word</em>", "Natural voices read each word and its example."],
      ["Learning <em>Japanese?</em>", "The reading sits right over the kanji."],
      [
        "Switching from <em>Anki?</em>",
        "Bring your decks from Anki, Quizlet, Mochi, Noji or Pleco.",
      ],
      ["Keep the <em>flame</em> lit", "A few minutes a day is enough."],
    ],
    hero: [
      { deck: "Geography", term: "Canberra", answer: "Capital of Australia" },
      { deck: "日本語 N5", answer: "weather" },
      { deck: "Chemistry", term: "H₂O", answer: "Water" },
      { deck: "Driving test", term: "Give way", answer: "Let crossing traffic go first" },
    ],
    ai: { note: "Claude added 12 cards" },
    decks: {
      langs: [
        [
          ["Suomi", 96, "dim"],
          ["Italiano", 130],
          ["日本語", 150, "lit"],
          ["Polski", 96, "dim"],
          ["Ελληνικά", 120],
        ],
        [
          ["Español", 140],
          ["Українська", 104, "dim"],
          ["한국어", 130],
          ["Français", 120, "lit"],
          ["Eesti", 100, "dim"],
        ],
        [
          ["Türkçe", 96, "dim"],
          ["Deutsch", 150, "lit"],
          ["中文", 140],
          ["Svenska", 104, "dim"],
          ["עברית", 110],
        ],
        [
          ["ქართული", 100],
          ["Português", 130],
          ["हिन्दी", 120, "dim"],
          ["Nederlands", 120],
          ["Dansk", 96, "dim"],
        ],
        [
          ["Čeština", 104, "dim"],
          ["العربية", 120],
          ["Tiếng Việt", 130, "lit"],
          ["Norsk", 104, "dim"],
          ["Română", 110],
        ],
      ],
      topics: [
        ["*Driving tests", "California DMV", "Leben in Deutschland"],
        ["German road signs", "*Citizenship tests", "US citizenship test"],
        ["Periodic table", "*Geography", "World capitals"],
        ["Spanish nationality test", "*Science", "The human body"],
      ],
    },
    smart: {
      vocab: "Vocabulary",
      lines: [
        ["il mercato", "the market", true],
        ["la piazza", "the square", true],
        ["la fermata", "the stop", true],
        ["il ponte", "the bridge", false],
        ["a destra", "on the right", true],
        ["sempre dritto", "straight on", false],
      ],
      picked: [
        ["il mercato", "the market"],
        ["la piazza", "the square"],
        ["la fermata", "the stop"],
        ["a destra", "on the right"],
      ],
      button: "Add 4 cards",
    },
    together: {
      bubble: "Learning Italian too? Join my deck",
      deck: "Shared deck · 48 cards",
      cards: [
        ["Casa", "la sedia", "the chair"],
        ["In città", "la piazza", "the square"],
        ["Casa", "la lampada", "the lamp"],
      ],
      joined: ["Marco joined", "Anna joined", "Sofia joined", "Leo joined"],
    },
    audio: {
      deck: "Lezione 15 · Italian",
      meaning: "the lamp",
      example: "Example",
      play: "Play the example",
      langs: ["Italian", "Japanese", "Finnish", "Spanish", "Ukrainian", "Korean"],
    },
    import: {
      counts: ["2,140 cards", "320 cards", "860 cards", "1,020 cards"],
      title: "Your decks",
      sub: "4,340 cards, ready to review",
    },
  },

  uk: {
    shots: [
      [
        "Вчи будь-що.<br><em>І пам’ятай.</em>",
        "Картки повертаються саме тоді, коли ти от-от їх забудеш.",
      ],
      [
        "Працює з <em>твоїм AI</em>",
        "Попроси Claude, ChatGPT чи будь-який застосунок, що підключається через MCP. Картки з’являться у твоїх колодах.",
      ],
      [
        "Почни з <em>готової колоди</em>",
        "27 мов, тести з водіння, тести на громадянство, географія, наука та інше.",
      ],
      [
        "Фото сторінки — <em>картки</em>",
        "Сфотографуй конспект. Lymi знайде терміни, а ти вибереш, які залишити.",
      ],
      [
        "Вчіться <em>разом</em>",
        "Поділися колодою з друзями чи класом. Нові картки отримують усі, а вчиться кожен у своєму темпі.",
      ],
      ["Почуй<br><em>кожне слово</em>", "Природні голоси читають кожне слово і приклад."],
      ["Вчиш <em>японську?</em>", "Читання — просто над кандзі."],
      ["Переходиш з <em>Anki?</em>", "Перенеси колоди з Anki, Quizlet, Mochi, Noji чи Pleco."],
      ["Нехай <em>вогник</em> горить", "Досить кількох хвилин на день."],
    ],
    hero: [
      { deck: "Географія", term: "Канберра", answer: "Столиця Австралії" },
      { deck: "日本語 N5", answer: "погода" },
      { deck: "Хімія", term: "H₂O", answer: "Вода" },
      { deck: "Тест з водіння", term: "Дай дорогу", answer: "Пропусти транспорт на перехресті" },
    ],
    ai: { note: "Claude додав 12 карток" },
    decks: {
      // Ukrainian readers are not offered decks that teach Ukrainian, so Serbian takes its place.
      langs: [
        [
          ["Suomi", 96, "dim"],
          ["Italiano", 130],
          ["日本語", 150, "lit"],
          ["Polski", 96, "dim"],
          ["Ελληνικά", 120],
        ],
        [
          ["Español", 140],
          ["Српски", 104, "dim"],
          ["한국어", 130],
          ["Français", 120, "lit"],
          ["Eesti", 100, "dim"],
        ],
        [
          ["Türkçe", 96, "dim"],
          ["Deutsch", 150, "lit"],
          ["中文", 140],
          ["Svenska", 104, "dim"],
          ["עברית", 110],
        ],
        [
          ["ქართული", 100],
          ["Português", 130],
          ["हिन्दी", 120, "dim"],
          ["Nederlands", 120],
          ["Dansk", 96, "dim"],
        ],
        [
          ["Čeština", 104, "dim"],
          ["العربية", 120],
          ["Tiếng Việt", 130, "lit"],
          ["Norsk", 104, "dim"],
          ["Română", 110],
        ],
      ],
      topics: [
        ["*Тести з водіння", "California DMV", "Leben in Deutschland"],
        ["Дорожні знаки Німеччини", "*Тести на громадянство", "Тест на громадянство США"],
        ["Періодична таблиця", "*Географія", "Столиці світу"],
        ["Тест на громадянство Іспанії", "*Наука", "Тіло людини"],
      ],
    },
    smart: {
      vocab: "Словник",
      lines: [
        ["il mercato", "ринок", true],
        ["la piazza", "площа", true],
        ["la fermata", "зупинка", true],
        ["il ponte", "міст", false],
        ["a destra", "праворуч", true],
        ["sempre dritto", "прямо", false],
      ],
      picked: [
        ["il mercato", "ринок"],
        ["la piazza", "площа"],
        ["la fermata", "зупинка"],
        ["a destra", "праворуч"],
      ],
      button: "Додати 4 картки",
    },
    together: {
      bubble: "Теж вчиш італійську? Приєднуйся до моєї колоди",
      deck: "Спільна колода · 48 карток",
      cards: [
        ["Casa", "la sedia", "стілець"],
        ["In città", "la piazza", "площа"],
        ["Casa", "la lampada", "лампа"],
      ],
      joined: ["Марко в колоді", "Анна в колоді", "Софія в колоді", "Лео в колоді"],
    },
    audio: {
      deck: "Lezione 15 · італійська",
      meaning: "лампа",
      example: "Приклад",
      play: "Прослухати приклад",
      langs: ["Італійська", "Японська", "Фінська", "Іспанська", "Англійська", "Корейська"],
    },
    import: {
      counts: ["2 140 карток", "320 карток", "860 карток", "1 020 карток"],
      title: "Твої колоди",
      sub: "4 340 карток, готові до повторення",
    },
  },

  ru: {
    shots: [
      [
        "Учи что угодно.<br><em>И помни.</em>",
        "Карточки возвращаются как раз тогда, когда ты вот-вот их забудешь.",
      ],
      [
        "Работает с <em>твоим AI</em>",
        "Попроси Claude, ChatGPT или любое приложение, которое подключается через MCP. Карточки появятся в твоих колодах.",
      ],
      [
        "Начни с <em>готовой колоды</em>",
        "27 языков, тесты по вождению, тесты на гражданство, география, наука и не только.",
      ],
      [
        "Фото страницы — <em>карточки</em>",
        "Сфотографируй конспект. Lymi найдёт термины, а ты выберешь, какие оставить.",
      ],
      [
        "Учитесь <em>вместе</em>",
        "Поделись колодой с друзьями или классом. Новые карточки получают все, а учится каждый в своём темпе.",
      ],
      ["Услышь<br><em>каждое слово</em>", "Естественные голоса читают каждое слово и пример."],
      ["Учишь <em>японский?</em>", "Чтение — прямо над кандзи."],
      ["Переходишь с <em>Anki?</em>", "Перенеси колоды из Anki, Quizlet, Mochi, Noji или Pleco."],
      ["Пусть <em>огонёк</em> горит", "Достаточно пары минут в день."],
    ],
    hero: [
      { deck: "География", term: "Канберра", answer: "Столица Австралии" },
      { deck: "日本語 N5", answer: "погода" },
      { deck: "Химия", term: "H₂O", answer: "Вода" },
      {
        deck: "Экзамен по вождению",
        term: "Уступи дорогу",
        answer: "Пропусти транспорт на перекрёстке",
      },
    ],
    ai: { note: "Claude добавил 12 карточек" },
    decks: {
      langs: [
        [
          ["Suomi", 96, "dim"],
          ["Italiano", 130],
          ["日本語", 150, "lit"],
          ["Polski", 96, "dim"],
          ["Ελληνικά", 120],
        ],
        [
          ["Español", 140],
          ["Українська", 104, "dim"],
          ["한국어", 130],
          ["Français", 120, "lit"],
          ["Eesti", 100, "dim"],
        ],
        [
          ["Türkçe", 96, "dim"],
          ["Deutsch", 150, "lit"],
          ["中文", 140],
          ["Svenska", 104, "dim"],
          ["עברית", 110],
        ],
        [
          ["ქართული", 100],
          ["Português", 130],
          ["हिन्दी", 120, "dim"],
          ["Nederlands", 120],
          ["Dansk", 96, "dim"],
        ],
        [
          ["Čeština", 104, "dim"],
          ["العربية", 120],
          ["Tiếng Việt", 130, "lit"],
          ["Norsk", 104, "dim"],
          ["Română", 110],
        ],
      ],
      topics: [
        ["*Тесты по вождению", "California DMV", "Leben in Deutschland"],
        ["Дорожные знаки Германии", "*Тесты на гражданство", "Тест на гражданство США"],
        ["Таблица Менделеева", "*География", "Столицы мира"],
        ["Тест на гражданство Испании", "*Наука", "Тело человека"],
      ],
    },
    smart: {
      vocab: "Словарь",
      lines: [
        ["il mercato", "рынок", true],
        ["la piazza", "площадь", true],
        ["la fermata", "остановка", true],
        ["il ponte", "мост", false],
        ["a destra", "направо", true],
        ["sempre dritto", "прямо", false],
      ],
      picked: [
        ["il mercato", "рынок"],
        ["la piazza", "площадь"],
        ["la fermata", "остановка"],
        ["a destra", "направо"],
      ],
      button: "Добавить 4 карточки",
    },
    together: {
      bubble: "Тоже учишь итальянский? Присоединяйся к моей колоде",
      deck: "Общая колода · 48 карточек",
      cards: [
        ["Casa", "la sedia", "стул"],
        ["In città", "la piazza", "площадь"],
        ["Casa", "la lampada", "лампа"],
      ],
      joined: ["Марко в колоде", "Анна в колоде", "София в колоде", "Лео в колоде"],
    },
    audio: {
      deck: "Lezione 15 · итальянский",
      meaning: "лампа",
      example: "Пример",
      play: "Прослушать пример",
      langs: ["Итальянский", "Японский", "Финский", "Испанский", "Английский", "Корейский"],
    },
    import: {
      counts: ["2 140 карточек", "320 карточек", "860 карточек", "1 020 карточек"],
      title: "Твои колоды",
      sub: "4 340 карточек, готовы к повторению",
    },
  },
};
