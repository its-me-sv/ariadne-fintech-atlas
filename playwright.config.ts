import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// E2E runs against the production build served by `vite preview`: the same dist/ that deploys.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a flaky test should fail loudly, not pass on the second try.
  retries: 0,
  // Each worker renders WebGL in software (SwiftShader) on the CPU. Too many at once starve each
  // other and turn a 1-second load into 10. Capped at 2 on CI's 4-vCPU runners, 4 locally.
  workers: process.env.CI ? 2 : 4,
  // An upper bound for auto-waiting assertions, not a delay: they return as soon as the UI matches.
  expect: { timeout: 15_000 },
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }], ["github"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    // The atlas honours prefers-reduced-motion: no trace autoplay and no travel animation between
    // cities, so the UI settles into a known state. One spec opts back into full motion.
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          // Headless CI runners have no GPU. These flags give Chromium a software WebGL (SwiftShader),
          // so react-three-fiber can create its context. Tests assert on the DOM around the canvas,
          // never on pixels.
          args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
        },
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
