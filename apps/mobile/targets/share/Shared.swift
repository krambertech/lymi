import Foundation
import Security

/// The app group the app and its extensions share, named after the app: this is `<app>.share`.
let appGroup = "group." + (Bundle.main.bundleIdentifier ?? "").split(separator: ".").dropLast()
  .joined(separator: ".")

struct ShareDeck: Decodable, Identifiable, Equatable {
  let id: String
  let name: String
}

/// What the app keeps for this sheet in the shared keychain: `apps/mobile/src/share/sync.tsx`.
struct ShareState: Decodable {
  let apiUrl: String
  let headers: [String: String]?
  let decks: [ShareDeck]
  let deckId: String?
  let enrich: Bool
  let strings: [String: String]

  static func read() -> ShareState? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      // expo-secure-store names the service after the key chain service and the item's authentication.
      kSecAttrService as String: "lymi-share:no-auth",
      kSecAttrAccount as String: Data("state".utf8),
      kSecAttrAccessGroup as String: appGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
      let data = item as? Data
    else { return nil }
    return try? JSONDecoder().decode(ShareState.self, from: data)
  }
}

/// The sheet's text, formatted by the app in the learner's language; English until it has run.
struct Strings {
  private let table: [String: String]

  init(_ table: [String: String]?) { self.table = table ?? [:] }

  private static let english = [
    "close": "Close",
    "add": "Add to {deck}",
    "deck": "Deck",
    "term": "Term",
    "meaning": "Meaning",
    "meaningByAi": "Leave it empty and the AI fills it in",
    "meaningByHand": "What it means",
    "source": "Source",
    "aiOn": "AI fills in",
    "aiOff": "AI off",
    "aiLabel": "Fill in the rest with AI",
    "moved": "Moved to {deck}, the deck for this language",
    "added": "Added “{term}” to {deck}",
    "skipped": "“{term}” is already in {deck}",
    "signedOut": "Open Lymi and sign in to add words from other apps.",
    "noDecks": "Create a deck on the web first, then add cards here.",
    "noText": "Select a word or phrase, then share it to Lymi.",
    "unreachable": "Lymi can’t be reached. Check your connection and try again.",
    "update": "Update Lymi to add words from other apps.",
    "failed": "That didn’t work. Try again.",
  ]

  subscript(_ key: String, term term: String = "", deck deck: String = "") -> String {
    (table[key] ?? Self.english[key] ?? key)
      .replacingOccurrences(of: "{term}", with: term)
      .replacingOccurrences(of: "{deck}", with: deck)
  }
}

/// The deck this sheet added to last, which wins over the app's own last deck.
enum LastShareDeck {
  private static let key = "share.deck"
  static var id: String? {
    get { UserDefaults(suiteName: appGroup)?.string(forKey: key) }
    set { UserDefaults(suiteName: appGroup)?.set(newValue, forKey: key) }
  }
}

enum AddOutcome {
  case added(term: String)
  case skipped(term: String, deckName: String)
}

enum ShareError: Error {
  case signedOut, update, unreachable, failed
}

/// The two calls the sheet makes, as the phone app makes them, with the app's session.
struct LymiAPI {
  let state: ShareState

  private func post(_ path: String, _ body: [String: Any]) async throws -> [String: Any] {
    guard let url = URL(string: state.apiUrl + path), let headers = state.headers else {
      throw ShareError.signedOut
    }
    var request = URLRequest(url: url, timeoutInterval: 20)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "content-type")
    for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    let data: Data
    let response: URLResponse
    do {
      (data, response) = try await URLSession.shared.data(for: request)
    } catch {
      throw ShareError.unreachable
    }
    switch (response as? HTTPURLResponse)?.statusCode ?? 0 {
    case 200..<300: break
    case 401: throw ShareError.signedOut
    case 426: throw ShareError.update
    case 500...: throw ShareError.unreachable
    default: throw ShareError.failed
    }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
  }

  /// The learner's deck in the term's language, or nil to keep the one chosen.
  func chooseDeck(term: String, source: String?) async -> String? {
    var body: [String: Any] = ["term": term]
    if let source, !source.isEmpty { body["source"] = source }
    return try? await post("/api/cards/deck-choice", body)["deckId"] as? String
  }

  func addCard(deckId: String, term: String, meaning: String, source: String, enrich: Bool)
    async throws -> AddOutcome
  {
    var body: [String: Any] = ["deckId": deckId, "term": term, "enrich": enrich]
    if !meaning.isEmpty {
      body["meaning"] = meaning
      body["meaningSource"] = "manual"
    }
    if !source.isEmpty { body["source"] = source }
    let outcome = try await post("/api/cards", body)
    if outcome["status"] as? String == "skipped" {
      let existing = outcome["existing"] as? [String: Any]
      return .skipped(
        term: existing?["term"] as? String ?? term, deckName: outcome["deckName"] as? String ?? "")
    }
    let card = outcome["card"] as? [String: Any]
    return .added(term: card?["term"] as? String ?? term)
  }
}
