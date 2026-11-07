// Draws the LabelLeaf app icon, splash, adaptive icon layers, and favicon from
// the one mark in src/ui/markGeometry.ts, and writes the master SVG beside
// them. Run with: npx tsx scripts/build-assets.ts
// Needs Playwright and Chromium to turn the SVG into PNG files.

import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARK } from "../src/ui/markGeometry";
import { theme } from "../src/ui/theme";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ASSETS = join(__dirname, "..", "assets");
const FRAUNCES = join(__dirname, "..", "node_modules", "@expo-google-fonts", "fraunces", "600SemiBold", "Fraunces_600SemiBold.ttf");

type Variant = "solid" | "mono";

/** The mark as SVG group markup inside a 100 by 100 box. */
function markGroup(variant: Variant, mono = "#000000"): string {
  const t = MARK.tag;
  const rot = `rotate(${MARK.tilt} ${MARK.tiltCenter.x} ${MARK.tiltCenter.y})`;
  if (variant === "mono") {
    // One color: the tag with the leaf and vein cut out of it.
    return `<mask id="cut"><rect width="100" height="100" fill="white"/><path d="${MARK.leafPath}" fill="black"/></mask>
<g transform="${rot}" mask="url(#cut)"><rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" rx="${t.radius}" fill="${mono}"/></g>`;
  }
  return `<g transform="${rot}">
<rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" rx="${t.radius}" fill="${theme.accent}"/>
<path d="${MARK.leafPath}" fill="${theme.bg}"/>
<path d="${MARK.veinPath}" stroke="${theme.gold}" stroke-width="${MARK.veinWidth}" stroke-linecap="round" fill="none"/>
</g>`;
}

/** Places the mark box at (x, y) with the given pixel size. */
function placed(variant: Variant, x: number, y: number, size: number): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">${markGroup(variant)}</g>`;
}

function svg(w: number, h: number, body: string, background?: string): string {
  const bg = background ? `<rect width="${w}" height="${h}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg}${body}</svg>`;
}

interface Asset {
  file: string;
  w: number;
  h: number;
  svg: string;
  transparent?: boolean;
}

// The font goes in as a data address, because the page has no file access.
const FONT_CSS = `@font-face { font-family: 'FrauncesAsset'; src: url('data:font/ttf;base64,${readFileSync(FRAUNCES).toString("base64")}'); }`;

const SPLASH_W = 1024;
const SPLASH_BOX = 853; // the mark box is 240 points when the image is shown 288 points wide
const splashBody =
  placed("solid", (SPLASH_W - SPLASH_BOX) / 2, -40, SPLASH_BOX) +
  `<text x="${SPLASH_W / 2}" y="830" text-anchor="middle" font-family="FrauncesAsset" font-size="150" fill="${theme.text}">LabelLeaf</text>`;

const assets: Asset[] = [
  // App icon: tag in leaf green, leaf cut out in cream, gold vein, on a cream field. No text.
  { file: "icon.png", w: 1024, h: 1024, svg: svg(1024, 1024, placed("solid", 112, 112, 800), theme.bg) },
  // Android adaptive layers. The mark stays inside the central safe zone.
  { file: "android-icon-foreground.png", w: 1024, h: 1024, transparent: true, svg: svg(1024, 1024, placed("solid", 192, 192, 640)) },
  { file: "android-icon-background.png", w: 1024, h: 1024, svg: svg(1024, 1024, "", theme.bg) },
  { file: "android-icon-monochrome.png", w: 1024, h: 1024, transparent: true, svg: svg(1024, 1024, placed("mono", 192, 192, 640)) },
  { file: "splash-icon.png", w: SPLASH_W, h: 1024, svg: svg(SPLASH_W, 1024, splashBody, theme.bg) },
  { file: "favicon.png", w: 96, h: 96, svg: svg(96, 96, placed("solid", 8, 8, 80), theme.bg) },
];

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  // The master drawing, kept with the assets so the pieces can be remade.
  writeFileSync(join(ASSETS, "labelleaf-mark.svg"), svg(1024, 1024, placed("solid", 112, 112, 800), theme.bg) + "\n");

  const browser = await chromium.launch();
  try {
    for (const a of assets) {
      const page = await browser.newPage({ viewport: { width: a.w, height: a.h }, deviceScaleFactor: 1 });
      await page.setContent(`<style>${FONT_CSS} html,body{margin:0;background:transparent}</style>${a.svg}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(ASSETS, a.file), omitBackground: !!a.transparent, clip: { x: 0, y: 0, width: a.w, height: a.h } });
      await page.close();
      console.log("wrote", a.file);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
