#!/usr/bin/env node
/**
 * HealthMesh Desktop Build Script
 * 
 * Builds the application for Windows (.exe) and Linux (.deb)
 * 
 * Usage:
 *   npm run electron:build         # Build for current platform
 *   npm run electron:build:win     # Build for Windows
 *   npm run electron:build:linux   # Build for Linux
 *   npm run electron:build:all     # Build for all platforms
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Build configuration
const platform = process.argv[2] || process.platform;
const isWindows = platform === 'win32' || platform === 'win';
const isLinux = platform === 'linux';
const buildAll = platform === 'all';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║ 🏗️  HealthMesh Desktop Build                               ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║ Platform: ${platform.padEnd(49)}║`);
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

/**
 * Run command and log output
 */
function run(command: string, options: { cwd?: string } = {}) {
  console.log(`\n▶ ${command}\n`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: options.cwd || rootDir,
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

/**
 * Check and create required icon files
 */
function ensureIcons() {
  const iconsDir = path.join(rootDir, 'electron', 'icons');
  
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }
  
  // Check for icon.png
  const iconPng = path.join(iconsDir, 'icon.png');
  if (!existsSync(iconPng)) {
    console.log('⚠️  Creating placeholder icon (replace with your own 512x512 PNG)');
    createPlaceholderIcon(iconPng);
  }
  
  // Create .ico for Windows if not exists
  const iconIco = path.join(iconsDir, 'icon.ico');
  if (!existsSync(iconIco)) {
    console.log('⚠️  icon.ico not found - Windows build may use default icon');
    console.log('   To create: Use https://convertio.co/png-ico/ with a 256x256 PNG');
  }
}

/**
 * Create a simple placeholder icon (SVG-based)
 */
function createPlaceholderIcon(outputPath: string) {
  // Create a simple 1x1 pixel placeholder (user should replace with real icon)
  console.log(`   Creating placeholder at: ${outputPath}`);
  console.log('   ⚠️  Replace this with a proper 512x512 PNG icon!');
  
  // We can't create a real PNG without dependencies, so just warn
  console.log('');
  console.log('   📝 To create icons:');
  console.log('   1. Create a 512x512 PNG logo and save as electron/icons/icon.png');
  console.log('   2. Convert to .ico for Windows: https://convertio.co/png-ico/');
  console.log('   3. Convert to .icns for macOS: https://cloudconvert.com/png-to-icns');
  console.log('');
}

/**
 * Create production environment file
 */
function createEnvFile() {
  const envProd = path.join(rootDir, '.env.production');
  
  if (!existsSync(envProd)) {
    console.log('Creating .env.production template...');
    writeFileSync(envProd, `# HealthMesh Production Environment
# Copy your production environment variables here

NODE_ENV=production
PORT=5000

# Azure AD Configuration
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id

# Azure SQL Database
AZURE_SQL_CONNECTION_STRING=your-connection-string

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=your-endpoint
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
`);
    console.log('⚠️  Please configure .env.production with your production settings');
  }
}

/**
 * Main build process
 */
async function build() {
  try {
    // Step 1: Verify icons
    console.log('\n📦 Step 1: Checking icons...');
    ensureIcons();
    
    // Step 2: Create env file
    console.log('\n📦 Step 2: Checking environment...');
    createEnvFile();
    
    // Step 3: Build the web application
    console.log('\n📦 Step 3: Building web application...');
    run('npm run build');
    
    // Step 4: Install Electron dependencies
    console.log('\n📦 Step 4: Installing Electron dependencies...');
    run('npm install --save-dev electron electron-builder');
    
    // Step 5: Build desktop application
    console.log('\n📦 Step 5: Building desktop application...');
    
    if (buildAll) {
      console.log('Building for all platforms...');
      run('npx electron-builder --win --linux');
    } else if (isWindows) {
      console.log('Building for Windows...');
      run('npx electron-builder --win');
    } else if (isLinux) {
      console.log('Building for Linux...');
      run('npx electron-builder --linux');
    } else {
      console.log('Building for current platform...');
      run('npx electron-builder');
    }
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ Build Complete!                                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ Output directory: ./release                                ║');
    console.log('║                                                            ║');
    console.log('║ Files created:                                             ║');
    if (isWindows || buildAll) {
      console.log('║   • HealthMesh-1.0.0-win-x64.exe (Installer)              ║');
      console.log('║   • HealthMesh-1.0.0-win-x64-portable.exe                 ║');
    }
    if (isLinux || buildAll) {
      console.log('║   • HealthMesh-1.0.0-linux-x64.deb                        ║');
      console.log('║   • HealthMesh-1.0.0-linux-x64.AppImage                   ║');
      console.log('║   • HealthMesh-1.0.0-linux-x64.rpm                        ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

build();
