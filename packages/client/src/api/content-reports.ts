import type { ContentReportInput, ContentReportOut } from "@lymi/core";
import { request } from "./request";

export const contentReportsApi = {
  reportContent: (body: ContentReportInput) =>
    request<ContentReportOut>("/api/content-reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
