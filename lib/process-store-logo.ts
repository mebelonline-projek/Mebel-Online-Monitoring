import sharp from "sharp";

const OUTPUT_SIZE = 512;
const CORNER_RADIUS = Math.round(OUTPUT_SIZE * 0.18);

/**
 * Proses logo upload: resize + sudut melengkung agar tidak tampil kotak di dalam bingkai.
 */
export async function processStoreLogoBuffer(input: Buffer): Promise<Buffer> {
  const resized = await sharp(input)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}">
      <rect width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="white"/>
    </svg>`
  );

  return sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .webp({ quality: 90 })
    .toBuffer();
}
