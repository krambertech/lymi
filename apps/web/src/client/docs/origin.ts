import { PRODUCT_ORIGIN, productUrl } from "../lib/origins";

/** The public docs describe the product API and MCP server on their canonical origin. */
export const ORIGIN = PRODUCT_ORIGIN;
export const OPENAPI_URL = productUrl("/api/openapi.json");
