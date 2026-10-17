import { requireOptionalNativeModule } from "expo";

/** One flattened page, a JPEG in the cache whose longest side is at most 1536 pixels. */
export interface ScannedPage {
  uri: string;
  width: number;
  height: number;
}

const native = requireOptionalNativeModule<{
  isAvailable(): boolean;
  scan(): Promise<ScannedPage[]>;
}>("LymiScanner");

/** False in the Simulator, which has no camera, and in a build without the module. */
export function isScannerAvailable() {
  return native?.isAvailable() ?? false;
}

/** Opens VisionKit's document camera for several pages in one go; resolves `[]` when the learner cancels. */
export function scanPages(): Promise<ScannedPage[]> {
  return native ? native.scan() : Promise.reject(new Error("This build has no document scanner"));
}
