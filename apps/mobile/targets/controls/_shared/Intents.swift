import AppIntents
import Foundation

// Each intent opens the app on a link, so a learner who is signed out lands on sign-in and then
// continues. The controls run their own, hidden from Shortcuts, so analytics can tell them apart.

@available(iOS 18.0, *)
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
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(EntryLink.url("capture", from: "shortcut", term: term)))
  }
}

@available(iOS 18.0, *)
struct ReviewIntent: AppIntent {
  static let title: LocalizedStringResource = "Review"
  static let description = IntentDescription("Opens a review in Lymi.")
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(EntryLink.url("review", from: "shortcut")))
  }
}

/// Answers from what the app last wrote, without opening it.
@available(iOS 18.0, *)
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

@available(iOS 18.0, *)
struct AddWordControlIntent: AppIntent {
  static let title: LocalizedStringResource = "Add a word"
  static let isDiscoverable = false
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(EntryLink.url("capture", from: "control")))
  }
}

@available(iOS 18.0, *)
struct ReviewControlIntent: AppIntent {
  static let title: LocalizedStringResource = "Review"
  static let isDiscoverable = false
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(EntryLink.url("review", from: "control")))
  }
}
