// Optional asset-authoring tool; sharp is not a site/build dependency.
// Run with SHARP_MODULE_PATH pointing to sharp if it is not installed locally.
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');

async function main() {
  // Exact pixels from the approved header identity. The stepped extraction
  // retains the complete lighthouse and beam, excluding the adjacent wordmark.
  const { data, info } = await sharp(resolve(root, 'src/assets/brand/WIF_brandmark_transparent_dark.png'))
    .extract({ left: 0, top: 20, width: 540, height: 320 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 125; y < info.height; y++) {
    for (let x = 280; x < info.width; x++) data[(y * info.width + x) * 4 + 3] = 0;
  }

  async function icon(size) {
    // Uniform scale, original colors and alpha, transparent square padding.
    const inset = Math.max(1, Math.round(size / 32));
    return sharp(data, { raw: info })
      .resize(size - inset * 2, size - inset * 2, {
        fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3'
      })
      .extend({ top: inset, bottom: inset, left: inset, right: inset, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
  }

  const sizes = [16, 32, 64];
  const frames = await Promise.all(sizes.map(icon));
  const directory = Buffer.alloc(6 + sizes.length * 16);
  directory.writeUInt16LE(1, 2); // ICO
  directory.writeUInt16LE(sizes.length, 4);
  let offset = directory.length;
  frames.forEach((frame, i) => {
    const entry = 6 + i * 16;
    directory[entry] = directory[entry + 1] = sizes[i];
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  const output = resolve(root, 'logos');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'wif-brand-favicon.ico'), Buffer.concat([directory, ...frames]));
  await writeFile(resolve(output, 'wif-brand-favicon-64.png'), frames[2]);
  await writeFile(resolve(output, 'wif-brand-apple-touch-icon-180.png'), await icon(180));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
