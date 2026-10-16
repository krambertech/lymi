import type { TagOut } from "@lymi/core";
import { request } from "./request";

/** A tag on cards the learner studies, with how many carry it. */
export type Tag = TagOut;

export const tagsApi = {
  tags: () => request<Tag[]>("/api/tags"),
};
