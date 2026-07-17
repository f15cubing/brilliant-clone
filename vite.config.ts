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
  build: {
    rollupOptions: {
      output: {
        // Split the heavy vendor libraries into their own chunks so they cache
        // independently and the initial bundle isn't one multi-megabyte file.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase") || id.includes("@firebase"))
            return "firebase";
          if (id.includes("jsxgraph")) return "jsxgraph";
          if (id.includes("mathlive")) return "mathlive";
          if (id.includes("mathjs")) return "mathjs";
          if (id.includes("katex")) return "katex";
          if (
            id.includes("react-router") ||
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          )
            return "react";
          return "vendor";
        },
      },
    },
  },
  test: {
    // Playwright e2e specs (demo/**.spec.ts) run via `playwright test`, not Vitest.
    exclude: [...configDefaults.exclude, "demo/**"],
  },
});
