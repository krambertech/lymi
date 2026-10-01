/// <reference types="vite/client" />

declare module "virtual:lymi-mcp-app" {
  /** The MCP Apps view, one self-contained HTML document. */
  export const html: string;
  /** A hash of `html`, for the resource URI hosts cache by. */
  export const version: string;
}
