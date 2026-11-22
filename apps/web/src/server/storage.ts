import type { CronJob } from "./services/erasure";

declare const storedAs: unique symbol;
declare const bucketNamed: unique symbol;

type BucketName = { [K in keyof Env]: Env[K] extends R2Bucket ? K : never }[keyof Env];

export type ObjectStore<B extends BucketName> = Omit<R2Bucket, "put" | "createMultipartUpload"> & {
  readonly [bucketNamed]?: B;
};

export type WithObjectStores<E> = {
  [K in keyof E]: E[K] extends R2Bucket ? ObjectStore<K & BucketName> : E[K];
};

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

type StoredName = keyof typeof STORED;

export type ObjectKey<N extends StoredName> = string & { readonly [storedAs]: N };

type StoreFor<N extends StoredName> = ObjectStore<(typeof STORED)[N]["bucket"]>;

const keyOf = <N extends StoredName>(name: N, path: string) =>
  `${STORED[name].prefix}${path}` as ObjectKey<N>;

function within<N extends StoredName>(name: N, key: string): ObjectKey<N> {
  if (!key.startsWith(STORED[name].prefix)) throw new Error(`Not a key of ${name}`);
  return key as ObjectKey<N>;
}

export const cardAudioFolder = (cardId: string) => `${STORED.cardAudio.prefix}${cardId}/`;

export const cardAudioKey = (cardId: string, path: string) =>
  keyOf("cardAudio", `${cardId}/${path}`);

export const newCardPictureKey = () => keyOf("cardPictures", `${crypto.randomUUID()}.webp`);

export const newAvatarKey = () => keyOf("avatars", `${crypto.randomUUID()}.webp`);

export const newImportFileKey = () => keyOf("importFiles", crypto.randomUUID());

export const importNotesFolder = (fileKey: string) => `${fileKey}.notes/`;

export const importNotesKey = (fileKey: string, chunk: number) =>
  within("importFiles", `${importNotesFolder(fileKey)}${chunk}.json`);

export const ankiConnectUploadKey = (userId: string, name: string) =>
  keyOf("ankiConnectUploads", `${userId}/${name}`);

export const newExportFileKey = () => keyOf("exportFiles", crypto.randomUUID());

export const exportSegmentKey = (fileKey: string, segment: number) =>
  within("exportFiles", `${fileKey}/${segment}`);

export const exportRecordsKey = (fileKey: string, segment: number) =>
  within("exportFiles", `${fileKey}.records/${segment}.json`);

export const lockKey = <N extends StoredName>(key: ObjectKey<N>) => `${key}.lock` as ObjectKey<N>;

export function putObject<N extends StoredName>(
  store: StoreFor<N>,
  key: ObjectKey<N>,
  value: ArrayBuffer | ArrayBufferView | string,
  options?: R2PutOptions,
): Promise<R2Object | null> {
  return (store as R2Bucket).put(key, value, options);
}

export function startUpload<N extends StoredName>(
  store: StoreFor<N>,
  key: ObjectKey<N>,
): Promise<R2MultipartUpload> {
  return (store as R2Bucket).createMultipartUpload(key);
}
