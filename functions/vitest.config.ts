import { defineConfig } from "vitest/config";

// Function unit tests use an INJECTED fake OpenAI client (no network/key).
// They import only the pure modules (validate / ratelimit / openai-core), so
// they need no firebase-admin or openai install to run.
export default defineConfig({
  test: {
    // `*.cf-test.ts` is deliberately a non-`*.test.ts` name so the repo-root
    // Vitest run (which globs `**/*.{test,spec}.ts`) never collects these and
    // therefore needs no firebase-admin/openai install to stay green.
    include: ["src/**/*.cf-test.ts"],
  },
});
