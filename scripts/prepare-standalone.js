const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function prepareStandalone() {
  const rootDir = path.join(__dirname, '..');
  const standaloneDir = path.join(rootDir, '.next', 'standalone');

  if (!fs.existsSync(standaloneDir)) {
    console.error('❌ .next/standalone does not exist. Run "next build" first.');
    process.exit(1);
  }

  console.log('📦 Preparing standalone server assets for Electron desktop packaging...');

  // 1. Copy public directory to .next/standalone/public
  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(standaloneDir, 'public');
  console.log('  -> Copying public assets to standalone/public...');
  copyRecursiveSync(publicSrc, publicDest);

  // 2. Copy .next/static to .next/standalone/.next/static
  const staticSrc = path.join(rootDir, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  console.log('  -> Copying .next/static to standalone/.next/static...');
  copyRecursiveSync(staticSrc, staticDest);

  // 3. Ensure electron assets exist
  const iconSrc = path.join(rootDir, 'electron', 'assets');
  if (!fs.existsSync(iconSrc)) {
    fs.mkdirSync(iconSrc, { recursive: true });
  }

  console.log('✅ Standalone production package is ready for Electron integration.');
}

prepareStandalone().catch((err) => {
  console.error('❌ Failed to prepare standalone bundle:', err);
  process.exit(1);
});
