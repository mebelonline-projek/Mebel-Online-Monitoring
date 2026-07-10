import sharp from "sharp";

const BRAND_BG = { r: 128, g: 0, b: 0, alpha: 1 };

async function renderIcon(input: Buffer, size: number): Promise<Buffer> {
  const padding = Math.round(size * 0.14);
  const inner = size - padding * 2;

  const logo = await sharp(input)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="white"/></svg>`
  );

  const roundedBg = await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  return sharp(roundedBg)
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

export async function generatePwaIconsFromBuffer(
  imageBuffer: Buffer
): Promise<{ icon192: Buffer; icon512: Buffer }> {
  const [icon192, icon512] = await Promise.all([
    renderIcon(imageBuffer, 192),
    renderIcon(imageBuffer, 512),
  ]);
  return { icon192, icon512 };
}
