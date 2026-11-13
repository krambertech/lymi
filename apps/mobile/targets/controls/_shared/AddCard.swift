import AppIntents
import Foundation
import Security

#if !LYMI_CONTROLS
  /// Share to Lymi's copy of the session and decks, which the app keeps current:
  /// `apps/mobile/src/share/sync.tsx`, read as `apps/mobile/targets/share/Shared.swift` reads it.
  struct CaptureState: Decodable {
    struct Deck: Decodable {
      let id: String
      let name: String
    }

    let apiUrl: String
    let headers: [String: String]?
    let decks: [Deck]
    let deckId: String?
    let enrich: Bool

    static func read() -> CaptureState? {
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "lymi-share:no-auth",
        kSecAttrAccount as String: Data("state".utf8),
        kSecAttrAccessGroup as String: lymiAppGroup,
        kSecReturnData as String: true,
        kSecMatchLimit as String: kSecMatchLimitOne,
      ]
      var item: CFTypeRef?
      guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
        let data = item as? Data
      else { return nil }
      return try? JSONDecoder().decode(CaptureState.self, from: data)
    }

    /// Share to Lymi's last deck, then Add a word's, as the share sheet opens on.
    var lastDeckId: String? {
      let shared = UserDefaults(suiteName: lymiAppGroup)?.string(forKey: "share.deck")
      return [shared, deckId].compactMap { $0 }.first { id in decks.contains { $0.id == id } }
    }
  }

  struct DeckEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Deck"
    static let defaultQuery = DeckQuery()

    let id: String
    let name: String

    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
  }

  /// The decks the learner owns, the only ones they can add to, as the app last wrote them.
  struct DeckQuery: EntityStringQuery {
    private var decks: [DeckEntity] {
      (CaptureState.read()?.decks ?? []).map { DeckEntity(id: $0.id, name: $0.name) }
    }

    func entities(for identifiers: [String]) async throws -> [DeckEntity] {
      decks.filter { identifiers.contains($0.id) }
    }

    func entities(matching string: String) async throws -> [DeckEntity] {
      decks.filter { $0.name.localizedStandardContains(string) }
    }

    func suggestedEntities() async throws -> [DeckEntity] { decks }
  }

  enum AddCardProblem: Error, CustomLocalizedStringResourceConvertible {
    case update, deckMissing, failed

    var localizedStringResource: LocalizedStringResource {
      switch self {
      case .update: "Update Lymi to add cards from Shortcuts."
      case .deckMissing: "That deck isn’t in Lymi anymore. Choose another one in the shortcut."
      case .failed: "Couldn’t add the card. Try again."
      }
    }
  }

  private enum Failure: Error {
    case signedOut, unreachable, problem(AddCardProblem)
  }

  private enum Outcome {
    case added(term: String)
    case skipped(term: String, deckName: String)
  }

  /// The calls the share sheet makes, with the app's session; `entry=shortcut` lets `cards_added`
  /// tell these cards from the app's.
  private struct CaptureAPI {
    let url: String
    let headers: [String: String]

    init?(_ state: CaptureState) {
      guard var headers = state.headers else { return nil }
      headers["x-lymi-client"] = headers["x-lymi-client"].map { $0 + "; entry=shortcut" }
      url = state.apiUrl
      self.headers = headers
    }

    private func post(_ path: String, _ body: [String: Any], timeout: TimeInterval) async throws
      -> [String: Any]
    {
      guard let url = URL(string: url + path) else { throw Failure.problem(.failed) }
      var request = URLRequest(url: url, timeoutInterval: timeout)
      request.httpMethod = "POST"
      request.setValue("application/json", forHTTPHeaderField: "content-type")
      for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
      request.httpBody = try JSONSerialization.data(withJSONObject: body)
      let data: Data
      let response: URLResponse
      do {
        (data, response) = try await URLSession.shared.data(for: request)
      } catch {
        throw Failure.unreachable
      }
      switch (response as? HTTPURLResponse)?.statusCode ?? 0 {
      case 200..<300: break
      case 401: throw Failure.signedOut
      case 404: throw Failure.problem(.deckMissing)
      case 426: throw Failure.problem(.update)
      case 500...: throw Failure.unreachable
      default: throw Failure.problem(.failed)
      }
      return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
    }

    /// The learner's deck in the term's language, or nil to keep the last one.
    func chooseDeck(term: String) async -> String? {
      try? await post("/api/cards/deck-choice", ["term": term], timeout: 8)["deckId"] as? String
    }

    func addCard(deckId: String, term: String, meaning: String, enrich: Bool) async throws
      -> Outcome
    {
      var body: [String: Any] = ["deckId": deckId, "term": term, "enrich": enrich]
      if !meaning.isEmpty {
        body["meaning"] = meaning
        body["meaningSource"] = "manual"
      }
      let outcome = try await post("/api/cards", body, timeout: 15)
      if outcome["status"] as? String == "skipped" {
        let existing = outcome["existing"] as? [String: Any]
        return .skipped(
          term: existing?["term"] as? String ?? term, deckName: outcome["deckName"] as? String ?? "")
      }
      let card = outcome["card"] as? [String: Any]
      return .added(term: card?["term"] as? String ?? term)
    }
  }

  /// At most 60 characters of the learner's text, cut at a word, as a dialog quotes it.
  private func quoted(_ text: String) -> String {
    guard text.count > 60 else { return text }
    let cut = text.prefix(60)
    let word = cut.lastIndex(of: " ").map { cut[..<$0] } ?? cut
    return String(word) + "…"
  }

  /// Adds a card in the background, so Shortcuts, Siri, Spotlight, the Action button and a
  /// shortcut in the share sheet save a term without opening the app. Signed out or offline, it
  /// continues in Add a word, whose outbox keeps the card until Lymi can be reached.
  struct AddCardIntent: AppIntent, ForegroundContinuableIntent {
    static let title: LocalizedStringResource = "Add a card"
    static let description = IntentDescription(
      "Adds a card without opening Lymi. Leave the deck empty and Lymi picks your deck for the term’s language."
    )
    // The app's session is readable only once the phone is unlocked.
    static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

    // A term is kept as typed, as Add a word keeps it.
    @Parameter(
      title: "Term",
      inputOptions: String.IntentInputOptions(capitalizationType: .none, autocorrect: false),
      requestValueDialog: "What’s the term?")
    var term: String

    @Parameter(title: "Meaning")
    var meaning: String?

    @Parameter(title: "Deck", requestValueDialog: "Which deck?")
    var deck: DeckEntity?

    @Parameter(title: "Fill in with AI")
    var enrich: Bool?

    static var parameterSummary: some ParameterSummary {
      Summary("Add \(\.$term) to \(\.$deck)") {
        \.$meaning
        \.$enrich
      }
    }

    init() {}

    func perform() async throws -> some IntentResult & ProvidesDialog {
      let text = term.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !text.isEmpty else { throw $term.needsValueError() }
      guard let state = CaptureState.read(), let api = CaptureAPI(state) else {
        throw continueInApp(text, "Sign in to Lymi to add “\(quoted(text))”.")
      }
      guard !state.decks.isEmpty else {
        throw continueInApp(text, "Create a deck in Lymi first.")
      }
      var deckId = deck?.id
      if deckId == nil, state.decks.count > 1, let chosen = await api.chooseDeck(term: text),
        state.decks.contains(where: { $0.id == chosen })
      {
        deckId = chosen
      }
      guard let deckId = deckId ?? state.lastDeckId ?? state.decks.first?.id else {
        throw AddCardProblem.failed
      }
      let deckName = deck?.name ?? state.decks.first { $0.id == deckId }?.name ?? ""
      do {
        let outcome = try await api.addCard(
          deckId: deckId, term: text,
          meaning: meaning?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "",
          enrich: enrich ?? state.enrich)
        switch outcome {
        case .added(let term):
          return .result(dialog: "Added “\(quoted(term))” to \(deckName)")
        case .skipped(let term, let deckName):
          return .result(dialog: "“\(quoted(term))” is already in \(deckName)")
        }
      } catch Failure.signedOut {
        throw continueInApp(text, "Sign in to Lymi to add “\(quoted(text))”.")
      } catch Failure.unreachable {
        throw continueInApp(
          text, "Lymi can’t be reached. Open the app to add “\(quoted(text))” there.")
      } catch Failure.problem(let problem) {
        throw problem
      }
    }

    /// Opens Add a word with the term, where sign-in and the offline outbox take over.
    private func continueInApp(_ text: String, _ dialog: IntentDialog) -> Error {
      needsToContinueInForegroundError(dialog) {
        await openInApp(EntryLink.url("capture", from: "shortcut", term: text))
      }
    }
  }
#endif
