import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Share to Lymi: reads the shared text and the page it came from, then shows the sheet.
@objc(ShareViewController)
final class ShareViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(named: "sheet")
    Task { @MainActor in
      let shared = await sharedText()
      let host = UIHostingController(
        rootView: ShareSheet(
          model: ShareModel(term: shared.term, source: shared.source, state: ShareState.read()),
          close: { [weak self] in self?.close() }
        ))
      host.view.backgroundColor = .clear
      addChild(host)
      host.view.frame = view.bounds
      host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      view.addSubview(host.view)
      host.didMove(toParent: self)
    }
  }

  private func close() {
    extensionContext?.completeRequest(returningItems: nil)
  }

  /// The selected text, and the page's title when the app sent one, as the card's source.
  private func sharedText() async -> (term: String, source: String) {
    let items = extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem } ?? []
    var term = ""
    var source = ""
    for item in items {
      if source.isEmpty, let title = item.attributedTitle?.string { source = title }
      for provider in item.attachments ?? [] where term.isEmpty {
        guard provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) else {
          continue
        }
        if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier)
          as? String
        {
          term = text
        }
      }
      if term.isEmpty, let text = item.attributedContentText?.string { term = text }
    }
    return (clean(term, limit: 500), clean(source, limit: 200))
  }

  /// One line, with the spaces a selection drags along trimmed and a link refused.
  private func clean(_ text: String, limit: Int) -> String {
    let line = text.split(whereSeparator: \.isWhitespace).joined(separator: " ")
    if let url = URL(string: line), url.scheme?.hasPrefix("http") == true { return "" }
    // The server counts UTF-16 units, as JavaScript does, so an emoji costs two.
    var cut = String(line.prefix(limit))
    while cut.utf16.count > limit { cut.removeLast() }
    return cut
  }
}
