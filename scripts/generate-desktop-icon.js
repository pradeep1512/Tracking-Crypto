const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const assetsDir = path.join(__dirname, '..', 'electron', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // High-resolution SVG for TrackingCrypt branding
  const svg = `
  <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradient -->
      <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0B0F19" />
        <stop offset="100%" stop-color="#05080E" />
      </linearGradient>

      <!-- Brand Gradient -->
      <linearGradient id="brandGrad" x1="64" y1="64" x2="448" y2="448" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#06B6D4" />
        <stop offset="50%" stop-color="#3B82F6" />
        <stop offset="100%" stop-color="#8B5CF6" />
      </linearGradient>

      <!-- Subtle Accent Glow -->
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <!-- Glass overlay -->
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="256" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
      </linearGradient>
    </defs>

    <!-- Base Rounded Container -->
    <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#bgGrad)" stroke="#1E293B" stroke-width="6" />

    <!-- Ambient Glow Ring -->
    <rect x="36" y="36" width="440" height="440" rx="96" fill="none" stroke="url(#brandGrad)" stroke-width="4" stroke-opacity="0.6" filter="url(#glow)" />

    <!-- Glass reflection -->
    <rect x="36" y="36" width="440" height="220" rx="96" fill="url(#glass)" />

    <!-- Center Icon: Dynamic Candlestick & Price Gap Signal -->
    <g transform="translate(116, 116)">
      <!-- Left Candlestick (Buy) -->
      <rect x="30" y="40" width="8" height="200" rx="4" fill="#10B981" opacity="0.4" />
      <rect x="18" y="80" width="32" height="120" rx="8" fill="#10B981" />

      <!-- Center Dynamic Lightning / Price Gap Vector -->
      <path d="M140 10 L80 140 L135 140 L110 270 L210 120 L150 120 Z" fill="url(#brandGrad)" filter="url(#glow)" />

      <!-- Right Candlestick (Sell) -->
      <rect x="232" y="30" width="8" height="220" rx="4" fill="#06B6D4" opacity="0.4" />
      <rect x="220" y="60" width="32" height="130" rx="8" fill="#06B6D4" />
    </g>

    <!-- TrackingCrypt Monogram Badge -->
    <text x="256" y="440" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
      TRACKINGCRYPT
    </text>
  </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  // Generate master 512x512 PNG
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), png512);
  console.log('✅ Generated electron/assets/icon.png (512x512)');

  // Generate multi-resolution PNG buffers for ICO
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    pngBuffers.push({ size, buffer: buf });
  }

  // Pack into a valid Windows ICO file format
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let currentOffset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // Width (0 means 256)
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Image offset
    dirEntries.push(entry);

    currentOffset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map((item) => item.buffer),
  ]);

  const icoPath = path.join(assetsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`✅ Generated ${icoPath} (${icoBuffer.length} bytes, ${count} resolutions: ${sizes.join('x, ')}x)`);
}

generateIcons().catch((err) => {
  console.error('Failed to generate desktop icons:', err);
  process.exit(1);
});
