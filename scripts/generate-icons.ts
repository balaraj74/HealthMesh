/**
 * Generate application icons from SVG
 * Creates PNG and ICO files for Electron packaging
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.join(__dirname, '..', 'electron', 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const svgPath = path.join(iconsDir, 'icon.svg');
const pngPath = path.join(iconsDir, 'icon.png');
const icoPath = path.join(iconsDir, 'icon.ico');

async function generateIcons() {
  console.log('🎨 Generating application icons...\n');

  try {
    // Read SVG
    const svgBuffer = readFileSync(svgPath);
    
    // Generate main PNG (512x512)
    console.log('Creating icon.png (512x512)...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(pngPath);
    console.log('✅ icon.png created');

    // Generate various sizes for Linux
    const sizes = [16, 32, 48, 64, 128, 256, 512];
    const pngPaths: string[] = [];
    
    for (const size of sizes) {
      const sizePath = path.join(iconsDir, `${size}x${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(sizePath);
      console.log(`✅ ${size}x${size}.png created`);
      pngPaths.push(sizePath);
    }

    // Generate ICO for Windows (includes multiple sizes)
    console.log('Creating icon.ico for Windows...');
    try {
      const icoSizes = [16, 32, 48, 256].map(size => path.join(iconsDir, `${size}x${size}.png`));
      const icoBuffer = await pngToIco(icoSizes);
      writeFileSync(icoPath, icoBuffer);
      console.log('✅ icon.ico created');
    } catch (icoErr) {
      console.warn('⚠️ Could not create ICO file:', icoErr);
    }

    console.log('\n✅ All icons generated successfully!');
    console.log('\n📁 Icons location: electron/icons/');
    console.log('   • icon.png (512x512) - All platforms');
    console.log('   • icon.ico - Windows');
    console.log('   • Various sizes for Linux');
    console.log('\n⚠️  To create macOS .icns file:');
    console.log('   Visit https://cloudconvert.com/png-to-icns and upload icon.png');
    console.log('   Save the result as electron/icons/icon.icns');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
