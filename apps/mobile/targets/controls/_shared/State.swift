import Foundation

/// The app group the app and its extensions share, named after the app; an extension is `<app>.<name>`.
let lymiAppGroup: String = {
  let id = Bundle.main.bundleIdentifier ?? ""
  let inExtension = Bundle.main.bundleURL.pathExtension == "appex"
  return "group." + (inExtension ? id.split(separator: ".").dropLast().joined(separator: ".") : id)
}()

/// What the controls and the due intent show, which the app writes after each review and sync:
/// `apps/mobile/src/entry/controls.ts`. The app formats it, because only it runs Lingui.
struct ControlsState: Decodable {
  struct Line: Decodable {
    let due: Int
    let value: String
    let spoken: String
  }

  struct Next: Decodable {
    let due: Int
    let value: String
    let spoken: String
    /// The next day's first moment, in milliseconds since 1970.
    let at: Double
  }

  let add: String
  let review: String
  let now: Line
  let next: Next?

  static func read() -> ControlsState? {
    guard let json = UserDefaults(suiteName: lymiAppGroup)?.string(forKey: "controls") else {
      return nil
    }
    return try? JSONDecoder().decode(ControlsState.self, from: Data(json.utf8))
  }

  /// Today's line, or the next day's once it has begun, so the control rolls over without the app.
  var line: Line {
    guard let next, Date().timeIntervalSince1970 * 1000 >= next.at else { return now }
    return Line(due: next.due, value: next.value, spoken: next.spoken)
  }
}

/// The links the app opens on, as `apps/mobile/src/entry/links.ts` builds them; `from` names the
/// entry point for analytics, and a link opened signed out is held through sign-in.
enum EntryLink {
  static func url(_ screen: String, from entry: String, term: String? = nil) -> URL {
    var link = URLComponents()
    link.scheme = "lymi"
    link.host = screen
    var query: [URLQueryItem] = []
    if let term = term?.trimmingCharacters(in: .whitespacesAndNewlines), !term.isEmpty {
      query.append(URLQueryItem(name: "term", value: term))
    }
    query.append(URLQueryItem(name: "from", value: entry))
    link.queryItems = query
    return link.url!
  }
}
