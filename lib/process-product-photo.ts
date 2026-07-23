import sharp from "sharp";

const MAX_SIDE = 800;

/** Kompres foto barang ke WebP hemat storage (max sisi 800px). */
export async function processProductPhotoBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78 })
    .toBuffer();
}
