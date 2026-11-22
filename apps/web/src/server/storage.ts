import type { CronJob } from "./services/erasure";

declare const declared: unique symbol;

export type ObjectKey = string & { readonly [declared]: true };

export type ObjectStore = Omit<R2Bucket, "put" | "createMultipartUpload">;

export type WithObjectStores<E> = {
  [K in keyof E]: E[K] extends R2Bucket ? ObjectStore : E[K];
};

type BucketName = { [K in keyof Env]: Env[K] extends R2Bucket ? K : never }[keyof Env];

type Stored = {
  bucket: BucketName;
  prefix: `${string}/`;
  erased: "with the account" | CronJob;
};

export const STORED = {
  cardAudio: { bucket: "AUDIO", prefix: "cards/", erased: "purge-card-audio" },
  cardPictures: { bucket: "PRIVATE_IMAGES", prefix: "cards/", erased: "with the account" },
  avatars: { bucket: "PRIVATE_IMAGES", prefix: "avatars/", erased: "with the account" },
  importFiles: { bucket: "IMPORTS", prefix: "imports/", erased: "with the account" },
  ankiConnectUploads: {
    bucket: "IMPORTS",
    prefix: "anki-connect/",
    erased: "anki-connect-uploads",
  },
  exportFiles: { bucket: "EXPORTS", prefix: "exports/", erased: "with the account" },
} as const satisfies Record<string, Stored>;

const keyOf = (name: keyof typeof STORED, path: string) =>
  `${STORED[name].prefix}${path}` as ObjectKey;

export const cardAudioFolder = (cardId: string) => `${STORED.cardAudio.prefix}${cardId}/`;

export const cardAudioKey = (cardId: string, path: string) =>
  keyOf("cardAudio", `${cardId}/${path}`);

export const newCardPictureKey = () => keyOf("cardPictures", `${crypto.randomUUID()}.webp`);

export const newAvatarKey = () => keyOf("avatars", `${crypto.randomUUID()}.webp`);

export const newImportFileKey = () => keyOf("importFiles", crypto.randomUUID());

export const importNotesFolder = (fileKey: string) => `${fileKey}.notes/`;

export const importNotesKey = (fileKey: string, chunk: number) =>
  `${importNotesFolder(fileKey)}${chunk}.json` as ObjectKey;

export const ankiConnectUploadKey = (userId: string, name: string) =>
  keyOf("ankiConnectUploads", `${userId}/${name}`);

export const newExportFileKey = () => keyOf("exportFiles", crypto.randomUUID());

export const exportSegmentKey = (fileKey: string, segment: number) =>
  `${fileKey}/${segment}` as ObjectKey;

export const exportRecordsKey = (fileKey: string, segment: number) =>
  `${fileKey}.records/${segment}.json` as ObjectKey;

export const lockKey = (key: ObjectKey) => `${key}.lock` as ObjectKey;

export function putObject(
  store: ObjectStore,
  key: ObjectKey,
  value: ArrayBuffer | ArrayBufferView | string,
  options?: R2PutOptions,
): Promise<R2Object | null> {
  return (store as R2Bucket).put(key, value, options);
}

export function startUpload(store: ObjectStore, key: ObjectKey): Promise<R2MultipartUpload> {
  return (store as R2Bucket).createMultipartUpload(key);
}
