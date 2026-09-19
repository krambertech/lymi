import { request } from "./request";

export type Me = { id: string; name: string; email: string };

export const accountApi = {
  me: () => request<Me>("/api/me"),
};
