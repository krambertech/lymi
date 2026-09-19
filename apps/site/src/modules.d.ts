/** A `.wasm` import is a compiled module under the Cloudflare Vite plugin, as under Wrangler. */
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}
