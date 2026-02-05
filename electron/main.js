/**
 * HealthMesh Desktop Application
 * Electron Main Process
 * 
 * This wraps the HealthMesh web application as a standalone desktop app
 * for Windows (.exe) and Linux (.deb)
 */

const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep references to prevent garbage collection
let mainWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;

// Configuration
const SERVER_PORT = process.env.PORT || 5000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'HealthMesh',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false, // Don't show until ready
    autoHideMenuBar: true,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load splash screen while server starts
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
}

/**
 * Start the backend server
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = isDev 
      ? path.join(__dirname, '..', 'server', 'index.ts')
      : path.join(process.resourcesPath, 'server', 'index.cjs');

    const command = isDev ? 'npx' : 'node';
    const args = isDev ? ['tsx', serverPath] : [serverPath];

    console.log(`Starting server: ${command} ${args.join(' ')}`);

    serverProcess = spawn(command, args, {
      cwd: isDev ? path.join(__dirname, '..') : process.resourcesPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: SERVER_PORT.toString(),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Server]', output);
      
      // Check if server is ready
      if (!started && (output.includes('listening') || output.includes('ready') || output.includes('started'))) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      if (!isQuitting) {
        // Restart server if it crashes
        setTimeout(() => startServer(), 2000);
      }
    });

    // Timeout - assume server is ready after 10 seconds
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 10000);
  });
}

/**
 * Wait for server to be available
 */
async function waitForServer(maxAttempts = 30) {
  const http = require('http');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${SERVER_URL}/api/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      console.log('Server is ready!');
      return true;
    } catch (err) {
      console.log(`Waiting for server... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  throw new Error('Server failed to start');
}

/**
 * Load the main application
 */
async function loadApp() {
  if (mainWindow) {
    await mainWindow.loadURL(SERVER_URL);
  }
}

/**
 * Create system tray icon
 */
function createTray() {
  const iconPath = path.join(__dirname, 'icons', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open HealthMesh',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  
  tray.setToolTip('HealthMesh');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

/**
 * Application menu
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HealthMesh',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              title: 'About HealthMesh',
              message: 'HealthMesh',
              detail: 'Intelligent Healthcare Management Platform\n\nVersion 1.0.0\n\n© 2026 HealthMesh',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Cleanup on exit
 */
function cleanup() {
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// ============================================================================
// Application Lifecycle
// ============================================================================

app.whenReady().then(async () => {
  console.log('HealthMesh Desktop starting...');
  
  createMenu();
  createWindow();
  createTray();
  
  try {
    // Start the backend server
    await startServer();
    
    // Wait for it to be responsive
    await waitForServer();
    
    // Load the application
    await loadApp();
    
    console.log('HealthMesh Desktop ready!');
  } catch (err) {
    console.error('Failed to start HealthMesh:', err);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start HealthMesh:\n\n${err.message}\n\nPlease check the logs and try again.`
    );
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  cleanup();
});

app.on('quit', () => {
  cleanup();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
