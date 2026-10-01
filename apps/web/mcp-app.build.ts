import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build, type Plugin, type PluginOption, type ViteDevServer } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const VIRTUAL_ID = "virtual:lymi-mcp-app";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const ROOT = fileURLToPath(new URL(".", import.meta.url));
const ENTRY = "src/client/mcp-app/index.html";

/**
 * The MCP Apps view as one self-contained HTML string, built by a nested Vite build and handed
 * to the Worker as `virtual:lymi-mcp-app`, so it runs on any host's sandbox origin. ADR 0026.
 */
export function mcpApp(viewPlugins: () => PluginOption[]): Plugin {
  let built: Promise<{ html: string; modules: Set<string> }> | null = null;
  let server: ViteDevServer | undefined;

  return {
    name: "lymi-mcp-app",
    configureServer(devServer) {
      server = devServer;
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined;
      built ??= buildView(viewPlugins());
      const { html, modules } = await built;
      for (const file of modules) this.addWatchFile(file);
      const version = createHash("sha256").update(html).digest("hex").slice(0, 12);
      return `export const html = ${JSON.stringify(html)};\nexport const version = ${JSON.stringify(version)};\n`;
    },
    async watchChange(file) {
      if (!built) return;
      const { modules } = await built;
      if (!modules.has(file)) return;
      built = null;
      for (const environment of Object.values(server?.environments ?? {})) {
        const module = environment.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) environment.moduleGraph.invalidateModule(module);
      }
    },
  };
}

/**
 * Tailwind scans the whole app from `styles.css`; the view uses only its own files and the
 * shared components, so their classes are all it ships.
 */
function narrowTailwindSources(): Plugin {
  return {
    name: "lymi-mcp-app-tailwind-sources",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/client/styles.css")) return undefined;
      return code.replace(
        '@import "tailwindcss";',
        '@import "tailwindcss" source(none);\n@source "./mcp-app";\n@source "./components";',
      );
    },
  };
}

async function buildView(plugins: PluginOption[]): Promise<{ html: string; modules: Set<string> }> {
  const output = await build({
    configFile: false,
    root: ROOT,
    logLevel: "warn",
    plugins: [
      narrowTailwindSources(),
      ...plugins,
      viteSingleFile({ removeViteModuleLoader: true }),
    ],
    resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
    build: {
      write: false,
      emptyOutDir: false,
      outDir: "dist/mcp-app",
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      rollupOptions: { input: ENTRY },
    },
  });
  const results = Array.isArray(output) ? output : [output];
  const modules = new Set<string>();
  let html: string | undefined;
  for (const result of results) {
    if (!("output" in result)) continue;
    for (const chunk of result.output) {
      if (chunk.type === "chunk") for (const id of chunk.moduleIds) modules.add(id);
      if (chunk.type === "asset" && chunk.fileName.endsWith(".html")) {
        html =
          typeof chunk.source === "string" ? chunk.source : new TextDecoder().decode(chunk.source);
      }
    }
  }
  if (!html) throw new Error(`The MCP app build produced no HTML from ${ENTRY}`);
  return { html, modules };
}
