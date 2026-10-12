import CoreHaptics
import ExpoModulesCore

/// One haptic event: a tap when `duration` is 0, otherwise a held pulse that swells in and out.
struct HapticEvent: Record {
  @Field var time: Double = 0
  @Field var intensity: Double = 0.5
  @Field var sharpness: Double = 0.5
  @Field var duration: Double = 0
}

/// Plays a pattern through Core Haptics, which expo-haptics cannot: the faint ticks under the embers
/// and the warm pulse as today's light fills at the end of a review.
public class LymiHapticsModule: Module {
  private var engine: CHHapticEngine?
  private var player: CHHapticPatternPlayer?

  public func definition() -> ModuleDefinition {
    Name("LymiHaptics")

    AsyncFunction("play") { (events: [HapticEvent]) in
      try self.play(events)
    }

    AsyncFunction("stop") {
      try? self.player?.stop(atTime: CHHapticTimeImmediate)
      self.player = nil
    }
  }

  private func play(_ events: [HapticEvent]) throws {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics, !events.isEmpty else { return }
    if engine == nil {
      let made = try CHHapticEngine()
      made.isAutoShutdownEnabled = true
      made.resetHandler = { [weak made] in try? made?.start() }
      engine = made
    }
    try engine?.start()
    let pattern = try CHHapticPattern(events: events.map(event), parameters: [])
    try? player?.stop(atTime: CHHapticTimeImmediate)
    player = try engine?.makePlayer(with: pattern)
    try player?.start(atTime: CHHapticTimeImmediate)
  }

  private func event(_ e: HapticEvent) -> CHHapticEvent {
    var parameters = [
      CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(e.intensity)),
      CHHapticEventParameter(parameterID: .hapticSharpness, value: Float(e.sharpness)),
    ]
    guard e.duration > 0 else {
      return CHHapticEvent(eventType: .hapticTransient, parameters: parameters, relativeTime: e.time)
    }
    parameters += [
      CHHapticEventParameter(parameterID: .attackTime, value: Float(e.duration * 0.4)),
      CHHapticEventParameter(parameterID: .releaseTime, value: Float(e.duration * 0.6)),
    ]
    return CHHapticEvent(
      eventType: .hapticContinuous, parameters: parameters, relativeTime: e.time,
      duration: e.duration)
  }
}
