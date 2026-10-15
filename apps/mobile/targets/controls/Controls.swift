import AppIntents
import SwiftUI
import WidgetKit

@main
struct LymiControls: WidgetBundle {
  var body: some Widget {
    AddWordControl()
    ReviewControl()
  }
}

/// Opens Add a word with the keyboard up. phone.md, "Outside the app".
struct AddWordControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "app.lymi.controls.add") {
      ControlWidgetButton(action: AddWordControlIntent()) {
        Label {
          Text(ControlsState.read()?.add ?? String(localized: "Add a word"))
        } icon: {
          Image("lymi.controlAdd").symbolRenderingMode(.hierarchical)
        }
      }
      .tint(Color("amber"))
    }
    .displayName("Add a word")
    .description("Opens Add a word in Lymi.")
  }
}

/// Opens a review; its value is what is due and today's goal, never the streak.
struct ReviewControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "app.lymi.controls.review", provider: ReviewValue()) { value in
      ControlWidgetButton(action: ReviewControlIntent()) {
        Label {
          Text(value.title)
          if !value.value.isEmpty { Text(value.value) }
        } icon: {
          Image("lymi.controlReview").symbolRenderingMode(.hierarchical)
        }
      }
      .tint(Color("amber"))
    }
    .displayName("Review")
    .description("Opens a review in Lymi and shows what’s due.")
  }
}

struct ReviewValue: ControlValueProvider {
  struct Value {
    let title: String
    let value: String
  }

  var previewValue: Value {
    Value(title: String(localized: "Review"), value: "")
  }

  func currentValue() async throws -> Value {
    let state = ControlsState.read()
    return Value(title: state?.review ?? String(localized: "Review"), value: state?.line.value ?? "")
  }
}
