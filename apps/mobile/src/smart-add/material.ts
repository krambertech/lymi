import { newId } from "@lymi/core";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { isScannerAvailable, scanPages } from "../../modules/lymi-scanner";

/** One photo or PDF of the lesson, kept on the phone until it is read. */
export interface Page {
  id: string;
  uri: string;
  kind: "photo" | "pdf";
  /** A PDF's file name; photos are numbered instead. */
  name: string;
}

/** What one pick brought: pages, and the text of any text file, such as a transcript. */
export interface Picked {
  pages: Page[];
  text: string;
  /** More than the room left, so only the first were kept. */
  over: boolean;
}

export const MAX_FILES = 10;

/** Deletes a file Smart add left in the cache; a file outside the cache is not its to delete. */
export function discard(uri: string) {
  if (!uri.startsWith(Paths.cache.uri)) return;
  try {
    new File(uri).delete();
  } catch {
    // Already gone, which is the outcome wanted.
  }
}
/** Wider pages cost more to read and read no better; the server shrinks again to the same size. */
const PAGE_SIDE = 1536;
const TEXT_FILE = /\.(txt|md|srt|vtt)$/i;

const photo = (uri: string): Page => ({ id: newId(), uri, kind: "photo", name: "" });

/** Shrunk and re-encoded as a JPEG on the phone, so the upload is small and carries no location. */
async function shrink(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    const full = await context.renderAsync();
    const scale = PAGE_SIDE / Math.max(full.width, full.height);
    const image =
      scale < 1
        ? await ImageManipulator.manipulate(uri)
            .resize({ width: Math.round(full.width * scale) })
            .renderAsync()
        : full;
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    // The picker's own copy is no longer needed once the smaller one exists.
    if (saved.uri !== uri) discard(uri);
    return saved.uri;
  } catch {
    // A format the phone cannot draw goes as it is; the server checks it.
    return uri;
  }
}

export const canScan = isScannerAvailable;

/** iOS's document camera: several pages in one go, found at their edges and flattened. */
export async function scan(room: number): Promise<Picked> {
  const pages = await scanPages();
  for (const extra of pages.slice(room)) discard(extra.uri);
  return {
    pages: pages.slice(0, room).map((p) => photo(p.uri)),
    text: "",
    over: pages.length > room,
  };
}

export async function choosePhotos(room: number): Promise<Picked> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: room,
    quality: 0.85,
    // A JPEG rather than HEIC, which the server cannot read.
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return { pages: [], text: "", over: false };
  const pages = await Promise.all(result.assets.map(async (a) => photo(await shrink(a.uri))));
  return { pages, text: "", over: false };
}

/** PDFs, photos and text files from Files; a text file's words join the lesson's text. */
export async function chooseFiles(room: number): Promise<Picked> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*", "text/*"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { pages: [], text: "", over: false };
  const pages: Page[] = [];
  const texts: string[] = [];
  let over = false;
  for (const asset of result.assets) {
    const type = asset.mimeType ?? "";
    if (type.startsWith("text/") || TEXT_FILE.test(asset.name)) {
      texts.push((await new File(asset.uri).text()).trim());
      discard(asset.uri);
      continue;
    }
    if (pages.length >= room) {
      over = true;
      continue;
    }
    if (type === "application/pdf" || /\.pdf$/i.test(asset.name))
      pages.push({ id: newId(), uri: asset.uri, kind: "pdf", name: asset.name });
    else if (type.startsWith("image/")) pages.push(photo(await shrink(asset.uri)));
  }
  return { pages, text: texts.filter(Boolean).join("\n\n"), over };
}

/** The read's form: Expo's fetch sends a file it can read the bytes of, not React Native's `{ uri }`. */
export function lessonForm(
  pages: Page[],
  text: string,
  deckId: string | undefined,
  hint: string | undefined,
) {
  const form = new FormData();
  if (text.trim()) form.append("text", text.trim());
  if (deckId) form.append("deckId", deckId);
  if (hint) form.append("hint", hint);
  for (const page of pages) form.append("file", new File(page.uri) as unknown as Blob);
  return form;
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
