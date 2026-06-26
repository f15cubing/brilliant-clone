import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "jsxgraph/distrib/jsxgraph.css": fileURLToPath(
        new URL("./node_modules/jsxgraph/distrib/jsxgraph.css", import.meta.url),
      ),
    },
  },
  test: {
    // Playwright e2e specs (demo/**.spec.ts) run via `playwright test`, not Vitest.
    exclude: [...configDefaults.exclude, "demo/**"],
  },
});
