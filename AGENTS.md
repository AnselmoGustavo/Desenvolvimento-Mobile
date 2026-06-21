# AGENTS

## Purpose
This file gives AI coding agents a quick, project-specific summary so they can be productive immediately.

## Project overview
- `Flora Yamaguti` is a local-first JavaScript app built with React + Vite.
- It targets desktop via Electron and has Capacitor/Android support configured.
- There is no backend or authentication implemented in the current codebase.

## Primary runtimes
- Desktop: Electron (`main.js`, `preload.js`, `renderer/index.html`)
- Web UI: React app source in `src/` built by Vite into `renderer/`
- Mobile: Capacitor uses `www/` as `webDir` and Android runtime under `android/`

## Key files and directories
- `package.json` — primary npm scripts and dependencies
- `main.js` — Electron bootstrap and production/dev loading logic
- `vite.config.js` — Vite build output target is `renderer`
- `src/App.jsx` — main React application with UI, data state, and local persistence
- `capacitor.config.json` — Capacitor configuration with `webDir: "www"`
- `documentacao-topico-3.md` — architecture and technology notes for the project

## Build and development commands
- `npm run dev` — start Vite development server
- `npm start` — launch Electron using the project root
- `npm run build` — build the React app for production
- `npm run package` — package a Windows installer with `electron-builder`
- `npm run electron:build` — build the React app and run Electron afterwards

## Conventions and important behavior
- The React app is implemented in plain `.jsx` files and uses hooks.
- State persistence is currently local-first; the app stores data in browser storage/localStorage under keys defined in `src/App.jsx`.
- Electron is configured with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Vite output must remain in `renderer/` so Electron production mode can load the correct files.
- Capacitor mobile config uses `www/` rather than the Electron `renderer` directory.

## Guidance for AI agents
- Prefer minimal changes and preserve the current local-first architecture.
- Do not assume a backend or remote database exists.
- Validate any UI/data persistence changes against `src/App.jsx`, because it contains the core application logic.
- Avoid changing Electron security settings without a strong need.
- When adding or updating mobile support, verify Capacitor configuration in `capacitor.config.json` and the `android/` project.

## References
- [Project architecture notes](./documentacao-topico-3.md)
- `package.json`
- `main.js`
- `src/App.jsx`
- `vite.config.js`
- `capacitor.config.json`
