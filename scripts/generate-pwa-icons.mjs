import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icons", "icon-192.svg");
const outDir = join(root, "public", "icons");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}
