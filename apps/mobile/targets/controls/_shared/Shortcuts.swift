import AppIntents

// Only the app offers App Shortcuts; the controls extension compiles this file without them.
#if !LYMI_CONTROLS
  /// Siri's phrases and Spotlight's shortcuts. A phrase cannot carry free text such as a term,
  /// so "Add a word" opens empty from Siri; Shortcuts can pass the term.
  @available(iOS 18.0, *)
  struct LymiShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
      AppShortcut(
        intent: AddWordIntent(),
        phrases: [
          "Add a word to \(.applicationName)",
          "Add a word in \(.applicationName)",
          "New word in \(.applicationName)",
        ],
        shortTitle: "Add a word",
        systemImageName: "plus"
      )
      AppShortcut(
        intent: ReviewIntent(),
        phrases: [
          "Review in \(.applicationName)",
          "Start a review in \(.applicationName)",
          "Review my cards in \(.applicationName)",
        ],
        shortTitle: "Review",
        systemImageName: "play"
      )
      AppShortcut(
        intent: CardsDueIntent(),
        phrases: [
          "How many cards are due in \(.applicationName)",
          "What’s due in \(.applicationName)",
        ],
        shortTitle: "Cards due",
        systemImageName: "rectangle.stack"
      )
    }
  }
#endif
