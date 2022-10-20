# Changelog

## 0.4.0

- Add SWC version to cache key for SWC cache
- Use config.build.target (if defined) for bundling dependencies in development
- Bump downwind to v0.3
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
