// Flow 1: land on the home page, enter the atlas, and see the 3D overview with its controls.
import { test, expect, data, atlasReady } from "./fixtures";

const stats = data<{ systems: number; rules: number; sources: number; traces: number }>("stats.json");

test("home page shows the real numbers and enters the atlas", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Ariadne - Fintech Atlas");
  await expect(page.getByRole("heading", { level: 1, name: "Ariadne" })).toBeVisible();

  const band = page.getByRole("region", { name: "The atlas in numbers" });
  for (const [label, value] of [["Systems", stats.systems], ["Rules", stats.rules], ["Sources", stats.sources], ["Traces", stats.traces]] as const) {
    await expect(band.locator("div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd")).toHaveText(value.toLocaleString("en-GB"));
  }

  await page.getByRole("link", { name: "Follow the thread" }).click();
  await expect(page).toHaveURL(/#overview-global$/);
  await atlasReady(page);
  await expect(page.getByRole("heading", { level: 1, name: "Global financial infrastructure" })).toBeAttached();
  await expect(page.getByRole("region", { name: "Key figures" })).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Map controls" })).toBeVisible();
  // The globe is drawn into a WebGL canvas. Assert it mounted and has a size; never inspect pixels.
  const canvas = page.locator(".ov-canvas canvas");
  await expect(canvas).toBeAttached();
  expect((await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(0);
});

test("a market city shows its transaction trace, stepped from the overlay", async ({ page }) => {
  await page.goto("./#overview-in");
  await atlasReady(page);
  await expect(page.getByRole("heading", { level: 1, name: "India payment infrastructure" })).toBeAttached();
  await expect(page.locator(".ov-canvas canvas")).toBeAttached();

  const trace = page.getByRole("region", { name: "Transaction trace" });
  await expect(trace).toBeVisible();
  // Reduced motion: the trace does not autoplay, so the Play button is offered.
  await expect(trace.getByRole("button", { name: "Play" })).toBeVisible();

  const current = trace.locator('button[aria-current="step"]');
  const before = await current.getAttribute("aria-label");
  await trace.getByRole("button", { name: "Next step" }).click();
  await expect(current).not.toHaveAttribute("aria-label", before ?? "");
  await trace.getByRole("button", { name: "Step 1" }).click();
  await expect(current).toHaveAttribute("aria-label", "Step 1");
});

test.describe("with full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the city trace autoplays and can be paused", async ({ page }) => {
    await page.goto("./#overview-uk");
    await atlasReady(page);
    const trace = page.getByRole("region", { name: "Transaction trace" });
    await trace.getByRole("button", { name: "Pause" }).click();
    await expect(trace.getByRole("button", { name: "Play" })).toBeVisible();
  });
});

test("this browser really has WebGL (SwiftShader in headless CI)", async ({ page }) => {
  // An environment check: if this fails, the 3D tests above are not testing what they claim.
  await page.goto("./");
  const gl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    const ctx = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!ctx) return null;
    const dbg = ctx.getExtension("WEBGL_debug_renderer_info");
    return dbg ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "webgl (renderer hidden)";
  });
  expect(gl, "no WebGL context").not.toBeNull();
  test.info().annotations.push({ type: "webgl-renderer", description: gl ?? "" });
});
