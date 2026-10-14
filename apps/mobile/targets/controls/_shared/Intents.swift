import AppIntents
import Foundation

#if !LYMI_CONTROLS
  import UIKit
#endif

// The controls' intents, which the app compiles too because a control's intent runs in the app.
// They are hidden from Shortcuts, so analytics can tell a control from Siri and Shortcuts.

/// Opens one of the app's own links from inside it, so a learner who is signed out lands on sign-in
/// and then continues. An intent that opens the app runs there, even
/// a control's; `OpenURLIntent` cannot open the app's own scheme.
@MainActor
func openInApp(_ url: URL) async {
  #if !LYMI_CONTROLS
    await UIApplication.shared.open(url)
  #endif
}

struct AddWordControlIntent: AppIntent {
  static let title: LocalizedStringResource = "Add a word"
  static let isDiscoverable = false
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult {
    await openInApp(EntryLink.url("capture", from: "control"))
    return .result()
  }
}

struct ReviewControlIntent: AppIntent {
  static let title: LocalizedStringResource = "Review"
  static let isDiscoverable = false
  static let openAppWhenRun = true

  @MainActor
  func perform() async throws -> some IntentResult {
    await openInApp(EntryLink.url("review", from: "control"))
    return .result()
  }
}
