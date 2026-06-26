import { defineConfig } from "@playwright/test";

/**
 * Playwright config dedicated to recording product demo videos.
 *
 * Runs against the Vite dev server in guest mode (no Firebase needed) and
 * captures one .webm per spec into demo/videos.
 */
export default defineConfig({
  testDir: ".",
  // Per-test artifacts (incl. video.webm) land here.
  outputDir: "videos",
  // Each demo is paced with deliberate pauses, so give specs plenty of room.
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 800 },
    video: {
      mode: "on",
      size: { width: 1280, height: 800 },
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
