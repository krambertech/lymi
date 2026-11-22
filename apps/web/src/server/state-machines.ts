import type { SQLiteTable } from "@lymi/core/db";
import * as schema from "@lymi/core/schema";

type Moves<State> = readonly (readonly [from: State, to: State])[];

export interface Machine<
  Table extends SQLiteTable = SQLiteTable,
  Column extends string = string,
  Legal extends Moves<unknown> = Moves<unknown>,
> {
  table: Table;
  column: Column;
  moves: Legal;
}

function machine<
  Table extends SQLiteTable,
  Column extends keyof Table["$inferSelect"] & string,
  const Legal extends Moves<Table["$inferSelect"][Column]>,
>(table: Table, column: Column, moves: Legal): Machine<Table, Column, Legal> {
  return { table, column, moves };
}

export const importStatus = machine(schema.imports, "status", [
  ["uploading", "inspecting"],
  ["inspecting", "ready"],
  ["ready", "importing"],
  ["importing", "done"],
  ["uploading", "failed"],
  ["inspecting", "failed"],
  ["ready", "failed"],
  ["importing", "failed"],
  ["uploading", "cancelled"],
  ["inspecting", "cancelled"],
  ["ready", "cancelled"],
]);

export const exportStatus = machine(schema.exportFiles, "status", [
  ["exporting", "done"],
  ["exporting", "failed"],
  ["done", "expired"],
]);

export const publicationStatus = machine(schema.deckPublications, "status", [
  ["published", "published"],
  ["withdrawn", "published"],
  ["published", "withdrawn"],
  ["withdrawn", "withdrawn"],
]);

export const editionStatus = machine(schema.deckEditions, "status", [
  ["draft", "published"],
  ["published", "published"],
  ["withdrawn", "published"],
  ["draft", "withdrawn"],
  ["published", "withdrawn"],
]);

export const readwiseStatus = machine(schema.readwiseConnections, "status", [
  ["active", "active"],
  ["refused", "active"],
  ["unreadable", "active"],
  ["active", "refused"],
  ["active", "unreadable"],
]);

export const reportAction = machine(schema.contentReports, "action", [
  [null, "dismiss"],
  [null, "archive_card"],
  [null, "archive_deck"],
  [null, "suspend_sharing"],
  ["dismiss", null],
  ["archive_card", null],
  ["archive_deck", null],
  ["suspend_sharing", null],
]);

export const enrichmentStatus = machine(schema.cards, "enrichmentStatus", [
  [null, "working"],
  ["failed", "working"],
  ["working", "working"],
  ["working", null],
  ["working", "failed"],
]);

export const pictureStatus = machine(schema.cardImages, "status", [
  ["active", "archived"],
  ["archived", "active"],
  ["active", "replaced"],
  ["archived", "replaced"],
]);

export const appleRevocationStatus = machine(schema.appleRevocations, "status", [
  ["pending", "pending"],
  ["pending", "revoked"],
  ["pending", "failed"],
]);
