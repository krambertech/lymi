import Observation
import SwiftUI

enum Line: Equatable {
  case moved(deck: String)
  case added(term: String, deck: String)
  case skipped(term: String, deck: String)
  case problem(String)
}

@MainActor @Observable
final class ShareModel {
  let state: ShareState?
  let strings: Strings
  let api: LymiAPI?
  var term: String
  var meaning = ""
  var source: String
  var deckId: String?
  var enrich: Bool
  var line: Line?
  var pending = false
  /// Set once the deck glows for the move to the term's language.
  var moved = false
  private var chosenByHand = false

  init(term: String, source: String, state: ShareState?) {
    self.term = term
    self.source = source
    self.state = state
    strings = Strings(state?.strings)
    api = state?.headers == nil ? nil : state.map(LymiAPI.init)
    enrich = state?.enrich ?? true
    let decks = state?.decks ?? []
    let last = [LastShareDeck.id, state?.deckId].compactMap { $0 }
    deckId = last.first { id in decks.contains { $0.id == id } } ?? decks.first?.id
    unavailable =
      api == nil
      ? strings["signedOut"]
      : decks.isEmpty ? strings["noDecks"] : term.isEmpty ? strings["noText"] : nil
  }

  var decks: [ShareDeck] { state?.decks ?? [] }
  var deck: ShareDeck? { decks.first { $0.id == deckId } }

  /// Why the sheet cannot add at all, decided once as it opens.
  private(set) var unavailable: String?

  var canAdd: Bool {
    unavailable == nil && !pending && !term.trimmingCharacters(in: .whitespaces).isEmpty
  }

  func choose(_ id: String) {
    chosenByHand = true
    deckId = id
    if case .moved = line { line = nil }
  }

  /// Moves to the learner's deck in the term's language, unless they chose one first.
  func chooseByLanguage() async {
    guard unavailable == nil, decks.count > 1, let api else { return }
    let source = self.source
    guard let id = await api.chooseDeck(term: term, source: source),
      !chosenByHand, id != deckId, let target = decks.first(where: { $0.id == id })
    else { return }
    withAnimation(.easeOut(duration: 0.25)) {
      deckId = id
      moved = true
      line = .moved(deck: target.name)
    }
  }

  /// True once the card is added, so the sheet can close.
  func add() async -> Bool {
    guard let api, let deck, !pending else { return false }
    let text = term.trimmingCharacters(in: .whitespaces)
    guard !text.isEmpty else { return false }
    pending = true
    defer { pending = false }
    do {
      let outcome = try await api.addCard(
        deckId: deck.id, term: text, meaning: meaning.trimmingCharacters(in: .whitespaces),
        source: source.trimmingCharacters(in: .whitespaces), enrich: enrich)
      LastShareDeck.id = deck.id
      switch outcome {
      case .added(let term):
        line = .added(term: term, deck: deck.name)
        return true
      case .skipped(let term, let deckName):
        line = .skipped(term: term, deck: deckName)
        return false
      }
    } catch let error as ShareError {
      let key =
        switch error {
        case .signedOut: "signedOut"
        case .update: "update"
        case .unreachable: "unreachable"
        case .failed: "failed"
        }
      line = .problem(strings[key])
      return false
    } catch {
      line = .problem(strings["failed"])
      return false
    }
  }
}

extension Font {
  static func onest(_ size: CGFloat, _ weight: Font.Weight = .regular, relativeTo style: TextStyle)
    -> Font
  {
    let name =
      switch weight {
      case .semibold, .bold: "Onest-SemiBold"
      case .medium: "Onest-Medium"
      default: "Onest-Regular"
      }
    return .custom(name, size: size, relativeTo: style)
  }
}

/// Add a word, as the app composes it, inside the share sheet: the shared term, the deck, the AI.
struct ShareSheet: View {
  @State var model: ShareModel
  let close: () -> Void
  @State private var picking = false
  @State private var addedTick = 0
  @State private var glow = false

  private var s: Strings { model.strings }

  var body: some View {
    VStack(spacing: 0) {
      header
      if let unavailable = model.unavailable {
        notice(unavailable)
        Spacer()
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            field(s["term"]) {
              TextField("", text: $model.term, axis: .vertical)
                .font(.onest(28, .semibold, relativeTo: .title))
                .foregroundStyle(Color("text"))
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
            }
            field(s["meaning"]) {
              TextField(
                "", text: $model.meaning,
                prompt: Text(model.enrich ? s["meaningByAi"] : s["meaningByHand"])
                  .foregroundStyle(Color("faint")),
                axis: .vertical
              )
              .font(.onest(17, relativeTo: .body))
              .foregroundStyle(Color("text"))
              .submitLabel(.done)
              .onSubmit { submit() }
            }
            if !model.source.isEmpty {
              field(s["source"]) {
                TextField("", text: $model.source, axis: .vertical)
                  .font(.onest(15, relativeTo: .subheadline))
                  .foregroundStyle(Color("text2"))
              }
            }
            statusLine
          }
          .padding(.horizontal, 20)
          .padding(.top, 16)
        }
        .scrollDismissesKeyboard(.interactively)
        chips
      }
    }
    .background(Color("sheet"))
    .sheet(isPresented: $picking) { deckSheet }
    .sensoryFeedback(.success, trigger: addedTick)
    .task { await model.chooseByLanguage() }
    .onChange(of: model.moved) { _, moved in
      guard moved else { return }
      glow = true
      Task {
        try? await Task.sleep(for: .seconds(1.6))
        withAnimation(.easeOut(duration: 0.6)) { glow = false }
      }
    }
  }

  private func submit() {
    Task {
      if await model.add() {
        addedTick += 1
        try? await Task.sleep(for: .seconds(0.9))
        close()
      }
    }
  }

  // MARK: Header

  private var header: some View {
    HStack(spacing: 12) {
      GlassCircle(label: s["close"], action: close) {
        LucideIcon(icon: .close, size: 18).foregroundStyle(Color("text"))
      }
      Spacer(minLength: 0)
      if let deck = model.deck, model.unavailable == nil {
        Button { picking = true } label: { deckPill(deck.name) }
          .buttonStyle(.plain)
          .accessibilityLabel(s["deck"])
          .accessibilityValue(deck.name)
      }
      Spacer(minLength: 0)
      if model.unavailable == nil {
        GlassCircle(label: s["add", deck: model.deck?.name ?? ""], primary: true, action: submit) {
          if model.pending {
            ProgressView().tint(Color("amberInk"))
          } else {
            LucideIcon(icon: .plus, size: 20, weight: 2.25).foregroundStyle(Color("amberInk"))
          }
        }
        .disabled(!model.canAdd)
      }
    }
    .padding(.horizontal, 16)
    .padding(.top, 20)
    .padding(.bottom, 8)
  }

  private func deckPill(_ name: String) -> some View {
    HStack(spacing: 8) {
      LucideIcon(icon: .deck, size: 18).foregroundStyle(Color(glow ? "amberText" : "text2"))
      Text(name)
        .font(.onest(17, .medium, relativeTo: .body))
        .foregroundStyle(Color(glow ? "amberText" : "text"))
        .lineLimit(1)
      LucideIcon(icon: .down, size: 16).foregroundStyle(Color("muted"))
    }
    .padding(.horizontal, 16)
    .frame(height: 44)
    .frame(maxWidth: 220)
    .glass(Capsule(), tint: glow ? Color("amberSoft") : nil)
    .overlay {
      Capsule().strokeBorder(Color("amber"), lineWidth: 1.5).opacity(glow ? 1 : 0)
    }
    .shadow(color: Color("amber").opacity(glow ? 0.35 : 0), radius: glow ? 12 : 0)
  }

  // MARK: Fields

  private func field<Content: View>(_ name: String, @ViewBuilder content: () -> Content)
    -> some View
  {
    VStack(alignment: .leading, spacing: 6) {
      Text(name)
        .font(.onest(13, relativeTo: .footnote))
        .foregroundStyle(Color("muted"))
      content()
        .padding(.bottom, 8)
        .overlay(alignment: .bottom) {
          Rectangle().fill(Color("edge")).frame(height: 1)
        }
    }
  }

  @ViewBuilder private var statusLine: some View {
    if let line = model.line {
      let (icon, colour, text): (Lucide, String, String) =
        switch line {
        case .moved(let deck): (.deck, "amberText", s["moved", deck: deck])
        case .added(let term, let deck): (.check, "good", s["added", term: term, deck: deck])
        case .skipped(let term, let deck): (.alert, "muted", s["skipped", term: term, deck: deck])
        case .problem(let message): (.alert, "danger", message)
        }
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        LucideIcon(icon: icon, size: 14, weight: 2.25)
          .foregroundStyle(Color(colour))
          .alignmentGuide(.firstTextBaseline) { $0[.bottom] - 2 }
        Text(text)
          .font(.onest(15, relativeTo: .subheadline))
          .foregroundStyle(Color(colour == "danger" ? "danger" : "text2"))
          .fixedSize(horizontal: false, vertical: true)
      }
      .transition(.opacity)
      .accessibilityElement(children: .combine)
    }
  }

  private var chips: some View {
    HStack(spacing: 8) {
      Button {
        model.enrich.toggle()
      } label: {
        HStack(spacing: 6) {
          LucideIcon(icon: .ai, size: 15)
          Text(model.enrich ? s["aiOn"] : s["aiOff"])
            .font(.onest(15, .medium, relativeTo: .subheadline))
        }
        .foregroundStyle(Color(model.enrich ? "ai" : "text2"))
        .padding(.horizontal, 14)
        .frame(height: 36)
        .background(Capsule().fill(Color(model.enrich ? "aiSoft" : "group")))
      }
      .buttonStyle(.plain)
      .accessibilityLabel(s["aiLabel"])
      .accessibilityAddTraits(model.enrich ? .isSelected : [])
      Spacer()
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 10)
  }

  private func notice(_ text: String) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      LucideIcon(icon: .alert, size: 16).foregroundStyle(Color("muted"))
        .alignmentGuide(.firstTextBaseline) { $0[.bottom] - 3 }
      Text(text)
        .font(.onest(17, relativeTo: .body))
        .foregroundStyle(Color("muted"))
        .fixedSize(horizontal: false, vertical: true)
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 20)
    .padding(.top, 16)
  }

  // MARK: Deck sheet

  private var deckSheet: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(s["deck"])
        .font(.onest(17, .semibold, relativeTo: .headline))
        .foregroundStyle(Color("text"))
        .padding(.horizontal, 20)
        .padding(.top, 24)
      ScrollView {
        VStack(spacing: 0) {
          ForEach(Array(model.decks.enumerated()), id: \.element.id) { index, deck in
            if index > 0 { Rectangle().fill(Color("edge")).frame(height: 1) }
            Button {
              model.choose(deck.id)
              picking = false
            } label: {
              HStack(spacing: 12) {
                LucideIcon(icon: .deck, size: 20).foregroundStyle(Color("text2"))
                Text(deck.name)
                  .font(.onest(17, relativeTo: .body))
                  .foregroundStyle(Color("text"))
                  .lineLimit(1)
                Spacer()
                if deck.id == model.deckId {
                  LucideIcon(icon: .check, size: 18, weight: 2.25).foregroundStyle(
                    Color("amberText"))
                }
              }
              .padding(.horizontal, 16)
              .frame(height: 52)
              .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(deck.id == model.deckId ? .isSelected : [])
          }
        }
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color("group")))
        .padding(.horizontal, 16)
      }
    }
    .background(Color("sheet"))
    .presentationDetents(model.decks.count > 5 ? [.medium, .large] : [.height(CGFloat(model.decks.count) * 53 + 90)])
    .presentationDragIndicator(.visible)
  }
}

/// A 44 pt glass circle in the sheet's top corners, amber for the one standing action.
struct GlassCircle<Label: View>: View {
  let label: String
  var primary = false
  let action: () -> Void
  @ViewBuilder let content: () -> Label

  var body: some View {
    Button(action: action) {
      content()
        .frame(width: 44, height: 44)
        .glass(Circle(), tint: primary ? Color("amber") : nil)
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(label)
  }
}

extension View {
  /// Liquid Glass on iOS 26, as the app's top-corner controls; the room's plate before it.
  @ViewBuilder func glass<S: Shape>(_ shape: S, tint: Color?) -> some View {
    if #available(iOS 26, *) {
      glassEffect(tint.map { Glass.regular.tint($0).interactive() } ?? .regular.interactive(), in: shape)
    } else {
      background(shape.fill(tint ?? Color("group")))
    }
  }
}
