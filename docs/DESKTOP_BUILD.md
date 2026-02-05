# Building HealthMesh Desktop Applications

This guide explains how to build HealthMesh as standalone desktop applications for Windows (.exe) and Linux (.deb).

## Prerequisites

1. **Node.js 18+** - Required for building
2. **npm or yarn** - Package manager
3. **Application Icons** - See Icons section below

### Platform-Specific Requirements

**For Windows builds:**
- Windows 10/11 or Wine on Linux
- .NET Framework 4.5+ (for NSIS installer)

**For Linux builds:**
- Any modern Linux distribution
- `fpm` for building .deb/.rpm (auto-installed by electron-builder)

## Quick Start

```bash
# Install dependencies (including Electron)
npm install

# Build for your current platform
npm run electron:build

# Or build for specific platforms:
npm run electron:build:win     # Windows (.exe)
npm run electron:build:linux   # Linux (.deb, .AppImage, .rpm)
npm run electron:build:all     # All platforms
```

## Output Files

After building, find the installers in the `./release` directory:

### Windows
- `HealthMesh-1.0.0-win-x64.exe` - NSIS Installer (recommended)
- `HealthMesh-1.0.0-win-x64-portable.exe` - Portable version (no install needed)

### Linux
- `HealthMesh-1.0.0-linux-x64.deb` - Debian/Ubuntu package
- `HealthMesh-1.0.0-linux-x64.AppImage` - Universal Linux package
- `HealthMesh-1.0.0-linux-x64.rpm` - RedHat/Fedora package

## Icons

You must provide application icons before building:

### Required Icon Files

Place these in `electron/icons/`:

| File | Size | Platform |
|------|------|----------|
| `icon.png` | 512x512 | All platforms |
| `icon.ico` | 256x256 | Windows |
| `icon.icns` | 512x512 | macOS |

### Creating Icons

1. **Design your logo** at 512x512 pixels in PNG format
2. **Convert to ICO** (Windows): Use [ConvertICO](https://convertico.com/) or [CloudConvert](https://cloudconvert.com/png-to-ico)
3. **Convert to ICNS** (macOS): Use [CloudConvert](https://cloudconvert.com/png-to-icns)

Or use this script to generate from a single PNG:
```bash
# Install icon generator
npm install -g png2icons

# Generate all formats
png2icons electron/icons/icon.png electron/icons/icon -allaliases
```

## Configuration

### Environment Variables

Create `.env.production` with your production settings:

```env
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
```

### Build Configuration

Edit `electron-builder.json` to customize:
- Application metadata
- Installer options
- Code signing (for distribution)
- Auto-update settings

## Development

### Test Electron locally

```bash
# Build and run in Electron
npm run electron:dev
```

### Debug Mode

```bash
# Run with DevTools
NODE_ENV=development npx electron .
```

## Distribution

### Windows

1. **Code Signing** (recommended for distribution):
   - Get a code signing certificate from DigiCert, Sectigo, etc.
   - Configure in `electron-builder.json`:
     ```json
     "win": {
       "certificateFile": "path/to/cert.pfx",
       "certificatePassword": "password"
     }
     ```

2. **Upload to website** or distribute the `.exe` file

### Linux

1. **Debian/Ubuntu**: Upload `.deb` to a PPA or distribute directly
2. **AppImage**: Most universal - works on any Linux distribution
3. **RPM**: For RedHat, Fedora, CentOS

### Auto-Updates

The app is configured for GitHub Releases auto-updates:

1. Create a GitHub release with the built files
2. The app will check for updates on startup
3. Users will be prompted to update

## Troubleshooting

### Build Fails on Linux

```bash
# Install required dependencies
sudo apt-get install build-essential libx11-dev libxkbfile-dev libsecret-1-dev
```

### "Cannot find module 'electron'"

```bash
npm install --save-dev electron electron-builder
```

### Windows build fails on Linux

Cross-compilation requires Wine:
```bash
# Ubuntu/Debian
sudo apt-get install wine64

# Then build
npm run electron:build:win
```

### Large bundle size

The built app includes Node.js runtime and all dependencies. Typical sizes:
- Windows: 150-200 MB
- Linux: 120-180 MB

To reduce size, consider:
- Using `asar` packaging (enabled by default)
- Excluding unused dependencies
- Using dynamic imports for large modules

## Architecture

```
HealthMesh Desktop
├── electron/
│   ├── main.js          # Electron main process
│   ├── splash.html      # Loading screen
│   ├── package.json     # Electron app metadata
│   └── icons/           # Application icons
├── dist/                # Built web app & server
├── release/             # Built installers (output)
└── electron-builder.json # Build configuration
```

The desktop app:
1. Starts the Node.js backend server
2. Opens an Electron window pointing to localhost
3. Shows a splash screen while loading
4. Provides system tray integration
5. Handles graceful shutdown

## Support

For issues with the desktop build:
1. Check the [Electron Builder docs](https://www.electron.build/)
2. Review build logs in the terminal
3. Open an issue on GitHub
