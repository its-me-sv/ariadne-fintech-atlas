// Builds the icon set from the master artwork. Run by hand when the master changes: npm run icons
// Master: docs/brand/ariadne-icon.png (engraved portrait on a teal rounded square).
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ---- easy to tweak ---------------------------------------------------------------
// Tight crop for the 16, 32 and 48 px icons, in master pixels: her face plus some teal.
const FACE_CROP = { left: 430, top: 130, size: 700 };
// The master's corners are already transparent; this mask also shaves the thin light rim
// along the straight edges. The radius is a little smaller than the artwork's own corners,
// so the artwork keeps its curve and the mask only trims the rim.
const RIM_INSET = 3;
const MASK_RADIUS = 290;
// Page palette (src/styles.css)
const GROUND = "#edf0fa";
const INK = "#17213a";
const INK_2 = "#57627d";
const TAGLINE = "An explorable, source-backed map of how payments really move.";
// ------------------------------------------------------------------------------------

const root = fileURLToPath(new URL("..", import.meta.url));
const MASTER = join(root, "docs/brand/ariadne-icon.png");
const PUB = join(root, "public");
const BRAND = join(root, "docs/brand");
mkdirSync(PUB, { recursive: true });

const png = (img, palette = true) => img.png(palette ? { palette: true, quality: 92, effort: 10, compressionLevel: 9 } : { compressionLevel: 9, effort: 10 });
const written = [];
async function save(img, file, palette) {
  await png(img, palette).toFile(file);
  written.push(file);
}

// 1. Clean, square, transparent-cornered master
const meta = await sharp(MASTER).metadata();
const { data, info } = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
}
const box = { left: x0 + RIM_INSET, top: y0 + RIM_INSET, width: x1 - x0 + 1 - 2 * RIM_INSET, height: y1 - y0 + 1 - 2 * RIM_INSET };
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><rect width="${box.width}" height="${box.height}" rx="${MASK_RADIUS}" ry="${MASK_RADIUS}" fill="#fff"/></svg>`);
const side = Math.max(box.width, box.height);
const clean = await sharp(
  await sharp(MASTER).extract(box).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer(),
).resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

// 2. Full artwork sizes
const full = (s) => sharp(clean).resize(s, s, { kernel: "lanczos3" });
await save(full(180), join(PUB, "apple-touch-icon.png"));
await save(full(192), join(PUB, "icon-192.png"));
await save(full(512), join(PUB, "icon-512.png"));
await save(full(64), join(PUB, "logo-64.png"));
await save(full(256), join(BRAND, "ariadne-icon-256.png"));

// 3. Small sizes from the face crop, slightly sharpened, with the same rounded corners
const face = await sharp(MASTER).extract({ left: FACE_CROP.left, top: FACE_CROP.top, width: FACE_CROP.size, height: FACE_CROP.size }).png().toBuffer();
async function small(s) {
  const r = Math.round(s * 0.22);
  const m = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  return sharp(await sharp(face).resize(s, s, { kernel: "lanczos3" }).sharpen({ sigma: s <= 16 ? 0.5 : 0.7 }).png().toBuffer())
    .composite([{ input: m, blend: "dest-in" }]);
}
await save(await small(16), join(PUB, "favicon-16.png"), false);
await save(await small(32), join(PUB, "favicon-32.png"), false);
const ico = await pngToIco(await Promise.all([16, 32, 48].map(async (s) => (await small(s)).png().toBuffer())));
writeFileSync(join(PUB, "favicon.ico"), ico);
written.push(join(PUB, "favicon.ico"));

// 4. GitHub social preview, 1280x640 (upload by hand in the repo settings)
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** Greedy word wrap, so the tagline fits right of the icon. */
const wrap = (s, max) => s.split(" ").reduce((lines, w) => {
  const last = lines[lines.length - 1];
  if (last && (last + " " + w).length <= max) lines[lines.length - 1] = last + " " + w; else lines.push(w);
  return lines;
}, []);
const font = "Manrope, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640">
  <text x="560" y="300" font-family="${font}" font-weight="800" font-size="104" fill="${INK}" letter-spacing="-2">Ariadne</text>
  <text x="564" y="368" font-family="${font}" font-weight="700" font-size="44" fill="${INK_2}">Fintech Atlas</text>
  <text x="564" y="440" font-family="${font}" font-weight="600" font-size="28" fill="${INK_2}">${wrap(TAGLINE, 34).map((l, i) => `<tspan x="564" dy="${i ? 40 : 0}">${esc(l)}</tspan>`).join("")}</text>
</svg>`);
await save(
  sharp({ create: { width: 1280, height: 640, channels: 4, background: GROUND } })
    .composite([{ input: await sharp(clean).resize(400, 400).png().toBuffer(), left: 120, top: 120 }, { input: text, left: 0, top: 0 }]),
  join(BRAND, "social-preview.png"),
);

console.log(`master ${meta.width}x${meta.height}, square ${box.width}x${box.height} -> ${side}px`);
for (const f of written) console.log(`${(statSync(f).size / 1024).toFixed(1).padStart(7)} KB  ${f.slice(root.length).replace(/\\/g, "/")}`);
