/**
 * The product API client both apps share: requests, query options, the grade and write outboxes,
 * and the review draw. Each app configures it once with its origin, session and storage.
 */
export type { ClientConfig, FailureMessages, KeyValueStore } from "./config";
export { configureClient } from "./config";
