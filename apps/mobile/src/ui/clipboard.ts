import { type TurboModule, TurboModuleRegistry } from "react-native";

/**
 * React Native's own clipboard, read from its native module: importing `Clipboard` from React
 * Native only adds a warning that it moved. Null where the module is missing, so a screen hides
 * its copy or paste button rather than offering one that does nothing.
 */
export const clipboard = TurboModuleRegistry.get<
  TurboModule & { setString(content: string): void; getString(): Promise<string> }
>("Clipboard");
