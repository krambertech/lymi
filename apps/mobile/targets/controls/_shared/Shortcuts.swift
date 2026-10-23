import AppIntents

// Siri, Shortcuts and Spotlight's intents live only in the app. Compiled into the controls extension
// too, iOS would run Cards due there, where the App Shortcuts provider is not.
#if !LYMI_CONTROLS
  struct AddWordIntent: AppIntent {
    static let title: LocalizedStringResource = "Add a word"
    static let description = IntentDescription(
      "Opens Add a word in Lymi, with the term filled in when you give one.")
    static let openAppWhenRun = true

    @Parameter(title: "Term")
    var term: String?

    static var parameterSummary: some ParameterSummary {
      Summary("Add \(\.$term) to Lymi")
    }

    init() {}

    @MainActor
    func perform() async throws -> some IntentResult {
      await openInApp(EntryLink.url("capture", from: "shortcut", term: term))
      return .result()
    }
  }

  struct ReviewIntent: AppIntent {
    static let title: LocalizedStringResource = "Review"
    static let description = IntentDescription("Opens a review in Lymi.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
      await openInApp(EntryLink.url("review", from: "shortcut"))
      return .result()
    }
  }

  /// Answers from what the app last wrote, without opening it.
  struct CardsDueIntent: AppIntent {
    static let title: LocalizedStringResource = "Cards due"
    static let description = IntentDescription(
      "Says how many cards are due and how today’s goal stands, without opening Lymi.")

    func perform() async throws -> some IntentResult & ReturnsValue<Int> & ProvidesDialog {
      guard let line = ControlsState.read()?.line else {
        return .result(value: 0, dialog: "Open Lymi to see what’s due.")
      }
      return .result(value: line.due, dialog: "\(line.spoken)")
    }
  }

  /// Siri's phrases and Spotlight's shortcuts. A phrase cannot carry free text such as a term,
  /// so "Add a word" opens empty from Siri and "Add a card" asks for it; Shortcuts can pass it.
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
        intent: AddCardIntent(),
        phrases: [
          "Add a card to \(.applicationName)",
          "Add a card in \(.applicationName)",
          "Save a card in \(.applicationName)",
        ],
        shortTitle: "Add a card",
        systemImageName: "plus.rectangle.on.rectangle"
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
