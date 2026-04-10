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

const contentBuffer = await sharp(svgPath)
  .resize(contentSize, contentSize)
  .png()
  .toBuffer();

// Create green canvas at exact size, composite content centered
await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: '#15803d',
  },
})
  .composite([{
    input: contentBuffer,
    gravity: 'centre',
  }])
  .png()
  .toFile(join(outDir, 'maskable-icon-512x512.png'));

console.log(`  maskable-icon-512x512.png (${maskableSize}x${maskableSize})`);

// Screenshots for PWA install UI
const screenshotSizes = [
  { name: 'screenshot-mobile.png', width: 390, height: 844, label: 'mobile' },
  { name: 'screenshot-desktop.png', width: 1280, height: 800, label: 'desktop' },
];

for (const { name, width, height, label } of screenshotSizes) {
  const svgScreen = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#0f172a"/>
    <rect x="${width / 2 - 40}" y="${height / 2 - 80}" width="80" height="80" rx="16" fill="#15803d"/>
    <text x="${width / 2}" y="${height / 2 + 30}" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="#f8fafc">NutriAI Diary</text>
    <text x="${width / 2}" y="${height / 2 + 60}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#94a3b8">Умный дневник питания</text>
  </svg>`;
  await sharp(Buffer.from(svgScreen))
    .png()
    .toFile(join(outDir, name));
  console.log(`  ${name} (${width}x${height}, ${label})`);
}
console.log('Done!');
