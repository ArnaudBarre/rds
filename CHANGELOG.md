# Changelog

## 0.10.0

- Support [subpath imports](https://nodejs.org/api/packages.html#subpath-imports)
- Bump downwind to 0.8 (renamed `downwindIntervalCheckMs` to `downwindIdleMs`)

## 0.9.0

- Remove tsc and eslint workers
- Truncate hmr update list to 10 files

## 0.8.4

- Fix inspector for React 19

## 0.8.3

- Implement automatic workspace folders support for Chrome DevTools
- Preserve breakpoints after HMR updates

## 0.8.2

- Fix HMR updates for CSS modules when reverting changes

## 0.8.1

- Bump OXC to 0.52

## 0.8.0

- Use Chokidar v4
- Replace SWC with OXC
- Support `bun.lock`
- Fix security issue with WS connection

## 0.7.12

- Fix detects cursor process on linux systems

## 0.7.11

- Add `declare module "*.css" {}` to client types for the project to work with TS 5.6 `noUncheckedSideEffectImports`

## 0.7.9

- Allow to disable the tsc worker via `server.tsc: false`

## 0.7.8

- Add support for Cursor in open in editor

## 0.7.7

- Support https imports

## 0.7.6

- Increase tsc worker memory
- Support `server.eslint: false` to disable ESLint worker.

## 0.7.5

- Add build.sourcemap option

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
