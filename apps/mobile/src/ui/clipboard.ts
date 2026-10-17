import { type TurboModule, TurboModuleRegistry } from "react-native";

/** React Native's clipboard from its native module, or null where it is missing so a screen hides its button. */
export const clipboard = TurboModuleRegistry.get<
  TurboModule & { setString(content: string): void; getString(): Promise<string> }
>("Clipboard");
