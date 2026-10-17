/** A `.wasm` import is a compiled module under the Cloudflare Vite plugin, as under Wrangler. */
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}

interface ImportMetaEnv {
  /** The UTC day of the build, `YYYY-MM-DD`, set in `astro.config.mjs`. */
  readonly BUILD_DAY: string;
}
