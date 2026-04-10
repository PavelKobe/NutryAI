import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'icons');

mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(join(outDir, name));
  console.log(`  ${name} (${size}x${size})`);
}

// Maskable icon: content in safe zone (80%), green background padding
const maskableSize = 512;
const contentSize = Math.round(maskableSize * 0.8); // 410px
const padding = Math.round((maskableSize - contentSize) / 2); // 51px

const contentBuffer = await sharp(svgPath)
  .resize(contentSize, contentSize)
  .png()
  .toBuffer();

await sharp(contentBuffer)
  .extend({
    top: padding,
    bottom: padding,
    left: padding,
    right: padding,
    background: '#15803d',
  })
  .resize(maskableSize, maskableSize) // exact size after extend
  .png()
  .toFile(join(outDir, 'maskable-icon-512x512.png'));

console.log(`  maskable-icon-512x512.png (${maskableSize}x${maskableSize})`);
console.log('Done!');
