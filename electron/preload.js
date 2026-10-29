/**
 * TrackingCrypt Desktop — Electron Preload Script
 * Follows strict security policies:
 * - contextIsolation: true
 * - nodeIntegration: false
 * Exposes only safe, immutable desktop metadata to the renderer window.
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('trackingCryptDesktop', {
  isDesktop: true,
  platform: process.platform,
  arch: process.arch,
  version: '0.1.0',
});
