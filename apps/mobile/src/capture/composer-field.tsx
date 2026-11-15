import { Text } from "../ui/primitives";

/** A field's name over its line, so a filled line still says what it holds. */
export function FieldName({ children }: { children: string }) {
  return (
    // The input below carries the same name, so VoiceOver and TalkBack read it once.
    <Text
      className="text-sm font-medium text-ink-muted"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {children}
    </Text>
  );
}
