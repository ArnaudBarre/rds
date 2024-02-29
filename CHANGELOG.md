# Changelog

## 0.7.4

- Always use base64 for inlined SVG to avoid issues when used inside `url()`

## 0.7.3

- Fix multiple issues with assets handling:
  - `?inline` now works for all assets
  - `http` assets in CSS are kept intact
  - `.svg` from CSS resolve to the URL (and not the React component)

## 0.7.2

- Fix regression on initial entry point from 0.7

## 0.7.1

- Add `build.downwindIntervalCheckMs` to config

## 0.7.0

- Downwind 0.7
- CSS import reordering
- Fix import of lib ending with `.js` (#1)

## 0.6.0

- TS 5 update: requires explicit extensions
- Publish as ESM
- Downwind 0.6.0 with Tailwind 3.3 update
- Commands to open browser, enable host & show QR Code

## 0.5.4

Client inspector: Context menu on option+right click to see all the intermediate components and jump to the right place!
Direct click is removed for two reasons:

- It doesn't play well with buttons and links
- In large apps, you often end up on the generic component instead of going inside the usage of it

## 0.5.3

- Support dynamic imports
- Output metafile to `/dist` with `build.metafile` config option or `--meta` in the build command
- Fix HMR for JSON imports
- Add `--port <number>` to the CLI
- Add `server.qrCode` option to print network URL as QR code (`--qr` in the CLI)

## 0.5.2

- Support JSON imports
- Support CSS data URL
- Click to component: fix tooltip position, better handling of non-clickable targets
- Improve error logging on failed dependencies pre-bundling

## 0.5.1

- Fix not found issues concurrent file updates (since v0.3). Public and source files are now properly seperated.
- Fix perf issue in imports rewrite
- Always provide parser options for SWC

## 0.5.0

- Show outline & path when pressing alt
- Bump downwind to [v0.4](https://github.com/ArnaudBarre/downwind/releases/tag/v0.4.0)

## 0.4.0

- Add SWC version to cache key for SWC cache
- Use config.build.target (if defined) for bundling dependencies in development
- Bump downwind to [v0.3](https://github.com/ArnaudBarre/downwind/releases/tag/v0.3.0)
- Use forwardRef for SVG component
- Fix: Make devtools update works when URL is not root

## 0.3.1

Hotfix: Missing quote in asset import rewrite

## 0.3.0

- Set `@arnaud-barre/downwind` as a peer-dependency
- Fix source maps for files with Fast Refresh
- Fix: Return 404 instead of crash on unknown public file

## 0.2.1

Hotfix: Fix config loader

## 0.2.0

- Click to component when pressing alt 🎉 (Inspired by [click-to-component](https://github.com/ericclemmons/click-to-component))
- CSS updates on Downwind config change 🎉 (Inspired by Vite, doesn't work for RDS config)
- Design in devtools 🎉 (Inspired by [UnoCSS](https://github.com/unocss/unocss/tree/main/packages/vite#design-in-devtools))

## 0.1.3

- Fix SWC errors display
- Fix crash on downwind error
- Fix SWC cache performances

## 0.1.2

- Fix handling of syntax error on JS HMR update
- Bump downwind

## 0.1.1

Fix build output

## 0.1.0

Initial release
