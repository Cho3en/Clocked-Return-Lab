/**
 * Vitest entry point.
 *
 * Route-level regression tests import the real Next.js route handler. Next
 * resolves the `server-only` marker internally; Vitest has no such alias, so
 * it points the marker at an empty stub. The marker keeps client bundles from
 * importing server code, which the production build still enforces.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
