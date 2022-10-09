# RDS: React Development Server

A [CRA](https://github.com/facebook/create-react-app) like experience, with a dev server inspired by [Vite](https://vitejs.dev/), using [swc](https://swc.rs/) for Fast Refresh and fast build powered by [esbuild](https://esbuild.github.io/).

CSS is handle via [downwind](https://github.com/ArnaudBarre/downwind) a lightweight Tailwind implementation.

## Create a new project

`npx degit ArnaudBarre/rds/template my-app && cd my-app && bun i && bun run dev`

## CLI

- `rds (start|dev) [--host] [--open] [--force]`: Starts the dev server
- `rds build`: Builds the app for production
- `rds (serve|preview) [--host] [--open]`: Serves the production build

## Defaults

- `index.html` should be in `/public` without referencing any source file.
- `src/index.tsx` is the App entry point

## Configuration

The config file should be name `rds.config.ts`.

```ts
import type { RDSConfig } from "@arnaud-barre/rds";

export const config: RDSConfig = {
  // ...
};
```

See the types definitions for more information on config options.

## JS API

Each of the three mode (dev, build, preview) is exposed via JS. See the types definitions for more information.

## Planned features

- design in devtool
- dynamic import
- qrCode
- workers
