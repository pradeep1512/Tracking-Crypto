# TrackingCrypt Windows x64 Desktop Application

Official standalone desktop release and installer guide for **TrackingCrypt**.

---

## 1. Release Files & Location

The generated Windows executables are located in the `release/` directory:

| Artifact | File Name | Size | Description |
| :--- | :--- | :--- | :--- |
| **Setup Installer** | [`TrackingCrypt-Setup-x64.exe`](file:///c:/Users/hp/Desktop/AI%20project/tracking-crypt/release/TrackingCrypt-Setup-x64.exe) | ~216 MB | Standard Windows NSIS installation wizard with Desktop & Start Menu shortcuts and Control Panel integration. |
| **Portable Standalone** | [`TrackingCrypt.exe`](file:///c:/Users/hp/Desktop/AI%20project/tracking-crypt/release/win-unpacked/TrackingCrypt.exe) | ~238 MB | Portable executable in `release/win-unpacked/` (runs directly without running setup). |

---

## 2. Installation Instructions

1. Navigate to:
   ```
   c:\Users\hp\Desktop\AI project\tracking-crypt\release\
   ```
2. Double-click **`TrackingCrypt-Setup-x64.exe`**.
3. Choose your preferred installation option:
   - **Current User** (per-user installation, default, does not require Administrator privileges)
   - **All Users** (machine-wide installation)
4. Select the destination directory (default: `%LOCALAPPDATA%\Programs\tracking-crypt`).
5. Choose whether to create a **Desktop Shortcut** and **Start Menu Shortcut**.
6. Click **Install**. Once finished, check **Run TrackingCrypt** and click **Finish**.

---

## 3. How It Works (Architecture)

TrackingCrypt is packaged as an Electron desktop shell wrapping the production Next.js standalone server:

```
+-------------------------------------------------------------+
|                TrackingCrypt Windows Desktop                |
|                                                             |
|  +-------------------------+     +-----------------------+  |
|  |     Electron Shell      |<--->| Embedded Standalone   |  |
|  |  (Chromium + Node.js)   | IPC | Next.js Server        |  |
|  |  - Native Window Frame  |     | (Localhost dynamic)   |  |
|  |  - System Tray / Menus  |     | - App Router Pages    |  |
|  |  - Secure Preload Script|     | - Auth & API Handlers |  |
|  +-------------------------+     | - Prisma / Storage    |  |
|                                  +-----------------------+  |
+-------------------------------------------------------------+
```

- **Zero Prerequisites**: End users do **NOT** need Node.js, npm, or Git installed on their machine. All runtime dependencies, Node binaries, and assets are bundled inside the application resources.
- **Port Management**: The application automatically finds an available free localhost port (starting at `3000`), binds the embedded standalone server, and serves the application securely inside the Electron Chromium container.
- **Data Persistence**: Sessions, authentication cookies, and application states are stored locally within the user's secure application data directory (`%APPDATA%\TrackingCrypt`).

---

## 4. Uninstallation

TrackingCrypt integrates with standard Windows uninstallation routines:

1. Open **Windows Settings** (`Win + I`).
2. Go to **Apps** > **Installed apps** (or **Add or remove programs**).
3. Search for **TrackingCrypt**.
4. Click the three dots (`...`) and select **Uninstall**.
5. Follow the NSIS uninstallation wizard to remove the application and clean up registered shortcuts.

---

## 5. Rebuilding the Installer

To produce a fresh build after making code changes:

```bash
# 1. Generate multi-resolution icons (.ico and .png)
npm run desktop:icons

# 2. Build Next.js standalone and copy static assets
npm run desktop:prepare

# 3. Compile and build the Windows x64 NSIS installer
npm run dist:win
```
