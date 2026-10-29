/**
 * TrackingCrypt Desktop — Electron Main Process
 *
 * Capabilities:
 * - Automatically initializes and manages the Next.js production standalone server
 * - Dynamically binds to an open local port (127.0.0.1)
 * - Strict security: contextIsolation, disabled nodeIntegration, external link protection
 * - Native Windows single-instance lock and clean child process shutdown
 */

const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
let serverPort = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Enforce single application instance on Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Locate a free dynamic port on 127.0.0.1
 */
function getAvailablePort(preferredPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(getAvailablePort(preferredPort + 1));
    });
    server.listen(preferredPort, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Locate the standalone server.js bundle in dev or packaged resources
 */
function getStandaloneServerPath() {
  const possiblePaths = [
    path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
    path.join(app.getAppPath(), '.next', 'standalone', 'server.js'),
    path.join(process.resourcesPath, 'standalone', 'server.js'),
    path.join(process.resourcesPath, '.next', 'standalone', 'server.js'),
    path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Poll localhost URL until Next.js HTTP server is ready to accept requests
 */
function waitForServerReady(port, maxRetries = 60, intervalMs = 300) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve();
      });
      req.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error(`Next.js server failed to respond on port ${port} after ${maxRetries} attempts.`));
        } else {
          setTimeout(check, intervalMs);
        }
      });
      req.end();
    };
    check();
  });
}

/**
 * Start the Next.js server in the background
 */
async function startServer() {
  serverPort = await getAvailablePort(3000);
  const serverPath = getStandaloneServerPath();

  if (!serverPath) {
    throw new Error('Could not locate Next.js standalone server bundle (.next/standalone/server.js).');
  }

  console.log(`[Electron] Starting Next.js standalone server at port ${serverPort}...`);
  console.log(`[Electron] Bundle path: ${serverPath}`);

  // Inherit environment variables with local overrides
  const env = {
    ...process.env,
    PORT: String(serverPort),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    AUTH_TRUST_HOST: 'true',
    ELECTRON_RUN_AS_NODE: '1',
  };

  serverProcess = fork(serverPath, [], {
    env,
    cwd: path.dirname(serverPath),
    stdio: 'ignore', // prevent terminal popups on Windows
    windowsHide: true,
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Server process error:', err);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Electron] Server process exited (code: ${code}, signal: ${signal})`);
  });

  await waitForServerReady(serverPort);
  console.log(`[Electron] Next.js server successfully ready on http://127.0.0.1:${serverPort}`);
}

/**
 * Create the primary desktop application window
 */
function createMainWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TrackingCrypt',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#090D16',
    autoHideMenuBar: true,
    show: false, // reveal after ready-to-show for smooth appearance
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Reveal window smoothly once content is rendered
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Restrict external URL navigation: open foreign links safely in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const targetUrl = `http://127.0.0.1:${serverPort}`;
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.error('[Electron] Failed to load URL:', err);
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  });
}

function cleanUpServer() {
  if (serverProcess) {
    console.log('[Electron] Shutting down Next.js server process...');
    try {
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 1000);
    } catch {
      // Ignored on exit
    }
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createMainWindow();
  } catch (err) {
    console.error('[Electron] Startup failure:', err);
    dialog.showErrorBox(
      'TrackingCrypt Startup Error',
      `Failed to initialize the local TrackingCrypt services:\n\n${err.message}\n\nPlease check your installation.`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  cleanUpServer();
});

app.on('window-all-closed', () => {
  cleanUpServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
