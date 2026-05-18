// Vite resolves `import.meta.glob` patterns at build time. Going four levels
// out of `apps/playground/src/playground/` lands in the monorepo root, and
// `vite.config.ts` already widens `server.fs.allow` to that scope. The raw
// import gives us the .vue source as a string — we never `import` the SFC
// itself here, the REPL recompiles it inside Monaco.
const sources = import.meta.glob("../../../../examples/*/*.vue", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Manifest is loaded as raw text + JSON.parse to sidestep tsconfig's
// `include: ["src/**/*"]` — a static JSON import outside that scope trips
// "File is not under rootDir" depending on the toolchain.
import manifestRaw from "../../../../examples/manifest.json?raw";

type ManifestEntry = { name: string; description: string };

export type Example = ManifestEntry & { code: string };

const codeByName = new Map<string, string>(
  Object.entries(sources).map(([path, code]) => {
    const segments = path.split("/");
    const dir = segments[segments.length - 2] ?? "";
    return [dir, code];
  }),
);

const manifest = JSON.parse(manifestRaw) as ManifestEntry[];

export const examples: Example[] = manifest.flatMap((entry) => {
  const code = codeByName.get(entry.name);
  return code ? [{ ...entry, code }] : [];
});
