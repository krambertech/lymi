import { type TurboModule, TurboModuleRegistry } from "react-native";

export const clipboard = TurboModuleRegistry.get<
  TurboModule & { setString(content: string): void; getString(): Promise<string> }
>("Clipboard");
