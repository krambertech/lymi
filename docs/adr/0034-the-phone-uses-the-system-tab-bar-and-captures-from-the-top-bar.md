---
status: accepted
date: 2026-10-12
---

# The phone uses iOS's own tab bar, and capture moves to the top bar

The phone's tabs are iOS's own tab bar, styled with Lymi's Onest labels and Lucide icons, rather than a bar Lymi draws in Liquid Glass. Capture leaves the tab bar for an amber glass button at the end of every tab's top bar, which grows into Add a word. This narrows [ADR 0029](0029-the-phone-app-is-expo-react-native-sharing-core.md), which had Lymi draw its persistent chrome, including the pill navigation in Liquid Glass.

## Context

Issue #549 asked for a tab bar and capture button that feel like iOS 26 glass rather than a drawing of it, and left open whether to build a custom bar on `expo-glass-effect` or use Expo Router's native tabs. Both were built and tried on the Simulator on 12 October 2026. A custom bar can use Apple's glass material, but not the system tab bar's lens: the selection that lifts, magnifies what is under it and flows between tabs. Every attempt to imitate it read as a shape moving inside glass. Apple's guidelines also say a tab bar is for navigation, not actions, and that the separate circle at its end belongs to search, so a capture circle there misuses it; the system bar will not tint that circle amber either.

## Considered options

- **iOS's own tab bar, capture in the top bar:** accepted. The lens, the press, Reduce Transparency and the bar before iOS 26 are the system's, and the tab bar's accessory carries a deck's review as a mini player. Unselected tabs take iOS's own monochrome style rather than Lymi's muted ink.
- **A custom glass bar with capture as an amber circle beside it:** rejected. It keeps full control of colour and the capture circle in the thumb's reach, but the selection's motion stays an imitation, and capture sits in the place iOS gives search.
- **The system bar with capture laid over its search slot:** rejected. It depends on matching where iOS draws that slot, and it looked like the hack it is.
- **Capture inside the bar, between the tabs:** rejected. It mixes an action into navigation and puts glass on glass.

## Consequences

- Capture is out of the thumb's natural reach. One tap still opens Add a word from every tab, and the planned Control Center control and Action button shortcut (phone.md, "Outside the app") give it back the reach.
- Each screen's top bar is pinned with its actions as glass buttons, as iOS keeps its own: the large title travels into it as the page scrolls, and a page's named back folds into iOS's round glass back.
- Inside a deck with cards due, the tab bar's accessory shows how many and starts the review. Before iOS 26 there is no accessory, so the deck keeps its Review button.
- Tab icons are template PNGs drawn from Lucide by `pnpm tab-icons`, because the system bar takes images, not SVG.
- The web keeps its opaque pill; the phone's tab bar no longer mirrors it.

[Issue #549](https://github.com/krambertech/lymi/issues/549)
