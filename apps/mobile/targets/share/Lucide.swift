import SwiftUI

/// The Lucide icons the sheet draws, as their 24-unit path data, so it matches the app's icons.
enum Lucide: String {
  case close = "M18 6 6 18M6 6l12 12"
  case plus = "M5 12h14M12 5v14"
  case check = "M20 6 9 17l-5-5"
  case down = "m6 9 6 6 6-6"
  case alert = "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M12 8v4M12 16h.01"
  case deck =
    "M10 2v7.751a.25.25 0 00.407.195l2.28-1.834a.5.5 0 01.627 0l2.28 1.834A.25.25 0 0016 9.751V2M4 19.5v-15A2.5 2.5 0 016.5 2H19a1 1 0 011 1v18a1 1 0 01-1 1H6.5a1 1 0 010-5H20"
  case ai =
    "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
}

struct LucideIcon: View {
  let icon: Lucide
  var size: CGFloat = 18
  var weight: CGFloat = 2

  var body: some View {
    SVGPath(d: icon.rawValue)
      .stroke(style: StrokeStyle(lineWidth: weight, lineCap: .round, lineJoin: .round))
      .frame(width: 24, height: 24)
      .scaleEffect(size / 24)
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}

/// The subset of SVG path data Lucide uses: moves, lines and circular arcs, absolute or relative.
struct SVGPath: Shape {
  let d: String

  func path(in rect: CGRect) -> Path {
    var path = Path()
    var scanner = Tokens(d)
    var command: Character = "M"
    var point = CGPoint.zero
    var start = CGPoint.zero
    while let next = scanner.command() ?? (scanner.hasNumber ? command : nil) {
      // A move's extra pairs are lines.
      command = next
      let relative = command.isLowercase
      let base = relative ? point : .zero
      switch command.uppercased() {
      case "M":
        point = CGPoint(x: base.x + scanner.number(), y: base.y + scanner.number())
        start = point
        path.move(to: point)
        command = relative ? "l" : "L"
      case "L":
        point = CGPoint(x: base.x + scanner.number(), y: base.y + scanner.number())
        path.addLine(to: point)
      case "H":
        point.x = base.x + scanner.number()
        path.addLine(to: point)
      case "V":
        point.y = base.y + scanner.number()
        path.addLine(to: point)
      case "A":
        let radius = scanner.number()
        _ = scanner.number()  // Lucide's arcs are circles, so ry and the rotation add nothing.
        _ = scanner.number()
        let large = scanner.flag()
        let sweep = scanner.flag()
        let end = CGPoint(x: base.x + scanner.number(), y: base.y + scanner.number())
        arc(&path, from: point, to: end, radius: radius, large: large, sweep: sweep)
        point = end
      case "Z":
        path.closeSubpath()
        point = start
      default:
        return path
      }
    }
    return path
  }

  /// SVG's endpoint arc, drawn as short lines from its centre.
  private func arc(
    _ path: inout Path, from a: CGPoint, to b: CGPoint, radius: CGFloat, large: Bool, sweep: Bool
  ) {
    let mid = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2)
    let dx = b.x - a.x
    let dy = b.y - a.y
    let half = hypot(dx, dy) / 2
    guard half > 0 else { return }
    let r = max(radius, half)
    let offset = sqrt(max(0, r * r - half * half))
    let sign: CGFloat = large == sweep ? -1 : 1
    let center = CGPoint(x: mid.x - sign * offset * dy / (2 * half), y: mid.y + sign * offset * dx / (2 * half))
    let from = atan2(a.y - center.y, a.x - center.x)
    var to = atan2(b.y - center.y, b.x - center.x)
    if sweep, to <= from { to += 2 * .pi }
    if !sweep, to >= from { to -= 2 * .pi }
    let steps = 24
    for i in 1...steps {
      let t = from + (to - from) * CGFloat(i) / CGFloat(steps)
      path.addLine(to: CGPoint(x: center.x + r * cos(t), y: center.y + r * sin(t)))
    }
  }
}

private struct Tokens {
  private let chars: [Character]
  private var i = 0

  init(_ text: String) { chars = Array(text) }

  private mutating func skip() {
    while i < chars.count, chars[i] == " " || chars[i] == "," { i += 1 }
  }

  var hasNumber: Bool {
    var j = i
    while j < chars.count, chars[j] == " " || chars[j] == "," { j += 1 }
    return j < chars.count && (chars[j].isNumber || chars[j] == "-" || chars[j] == ".")
  }

  mutating func command() -> Character? {
    skip()
    guard i < chars.count, chars[i].isLetter else { return nil }
    defer { i += 1 }
    return chars[i]
  }

  /// An arc flag is one digit, and may touch the next number.
  mutating func flag() -> Bool {
    skip()
    defer { i += 1 }
    return chars[i] == "1"
  }

  mutating func number() -> CGFloat {
    skip()
    var text = ""
    var dot = false
    if i < chars.count, chars[i] == "-" {
      text.append("-")
      i += 1
    }
    while i < chars.count {
      let c = chars[i]
      if c.isNumber {
        text.append(c)
      } else if c == ".", !dot {
        dot = true
        text.append(c)
      } else {
        break
      }
      i += 1
    }
    return CGFloat(Double(text) ?? 0)
  }
}
