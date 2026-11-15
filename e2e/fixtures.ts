import { test as base, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The generated data files, so tests compare the UI against the data instead of hard-coded numbers. */
export const data = <T = unknown>(name: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), "public", "data", name), "utf8")) as T;

/**
 * Every test:
 * - fails on any uncaught page error, so a WebGL or React crash cannot pass silently;
 * - blocks the external flag CDN, so runs do not depend on a third-party host
 *   (the app falls back to small text chips, which is its designed behaviour).
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("https://flagcdn.com/**", (r) => r.abort());
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * The atlas chrome is ready once the scope button shows its counts (core.json, 1.5 MB, has loaded
 * and been indexed). Auto-waits and returns as soon as the counts appear.
 */
export async function atlasReady(page: Page) {
  await expect(page.getByRole("button", { name: /systems, \d+ rules mapped/ })).toBeVisible();
}
