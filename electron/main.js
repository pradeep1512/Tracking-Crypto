/**
 * TrackingCrypt Desktop — Electron Main Process
 *
 * Capabilities:
 * - Automatically initializes and manages the Next.js production standalone server via utilityProcess
 * - Dynamically binds to an open local port (127.0.0.1)
 * - Strict security: contextIsolation, disabled nodeIntegration, external link protection
 * - Native Windows single-instance lock and clean child process shutdown
 * - Real-time stderr/stdout server log capture to userData directory
 */

const { app, BrowserWindow, shell, dialog, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
let serverPort = null;
let serverExitedPrematurely = false;
let serverExitCode = null;
let lastStderr = '';

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
 * Locate the standalone server.js bundle in packaged resources or dev
 */
function getStandaloneServerPath() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'standalone', 'server.js'),
    path.join(app.getAppPath(), '.next', 'standalone', 'server.js'),
    path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
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
function waitForServerReady(port, maxRetries = 60, intervalMs = 250) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      if (serverExitedPrematurely) {
        return reject(
          new Error(
            `Next.js server process exited prematurely with code ${serverExitCode}.\n\nLog details:\n${
              lastStderr.slice(-400) || 'Check server.log for full details.'
            }`
          )
        );
      }

      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve();
      });

      req.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(
            new Error(
              `Next.js server failed to respond on port ${port} after ${maxRetries} attempts.\n\n${
                lastStderr ? 'Last error: ' + lastStderr.slice(-300) : ''
              }`
            )
          );
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
 * Start the Next.js standalone server using Electron's native utilityProcess
 */
async function startServer() {
  serverPort = await getAvailablePort(3000);
  const serverPath = getStandaloneServerPath();

  if (!serverPath) {
    throw new Error('Could not locate Next.js standalone server bundle (standalone/server.js).');
  }

  const logDir = app.getPath('userData');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'server.log');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  logStream.write(`\n--- TrackingCrypt Starting at ${new Date().toISOString()} ---\n`);
  logStream.write(`Port: ${serverPort}, Server Path: ${serverPath}\n`);

  // Environment for the embedded Next.js server
  const env = {
    ...process.env,
    PORT: String(serverPort),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    AUTH_TRUST_HOST: 'true',
  };

  serverExitedPrematurely = false;
  serverExitCode = null;
  lastStderr = '';

  serverProcess = utilityProcess.fork(serverPath, [], {
    env,
    cwd: path.dirname(serverPath),
    stdio: 'pipe',
    serviceName: 'TrackingCrypt-NextServer',
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (chunk) => {
      logStream.write(chunk);
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      lastStderr += text;
      logStream.write(chunk);
    });
  }

  serverProcess.on('exit', (code) => {
    serverExitedPrematurely = true;
    serverExitCode = code;
    logStream.write(`[Server Exit] Process exited with code ${code}\n`);
  });

  await waitForServerReady(serverPort);
  logStream.write(`[Server Ready] Successfully bound to http://127.0.0.1:${serverPort}\n`);
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
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  });
}

function cleanUpServer() {
  if (serverProcess) {
    try {
      serverProcess.kill();
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
    dialog.showErrorBox(
      'TrackingCrypt Startup Error',
      `Failed to initialize the local TrackingCrypt services:\n\n${err.message}\n\nLog location: ${path.join(
        app.getPath('userData'),
        'server.log'
      )}`
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
