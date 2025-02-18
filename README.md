# RDS: React Development Server [![npm](https://img.shields.io/npm/v/@arnaud-barre/rds)](https://www.npmjs.com/package/@arnaud-barre/rds)

A modern [CRA](https://github.com/facebook/create-react-app) inspired by [Vite](https://vitejs.dev/) using [OXC](https://oxc.rs/) for Fast Refresh, [Lightning CSS](https://lightningcss.dev/) for CSS in dev and [esbuild](https://esbuild.github.io/) for bundling.

CSS is handled via [downwind](https://github.com/ArnaudBarre/downwind), a bundler-first Tailwind implementation.

## Create a new project

`bunx degit ArnaudBarre/rds/template my-app && cd my-app && bun i && bun run dev`

## CLI

- `rds (start|dev) [--host] [--open] [--force] [--port <number>]`: Starts the dev server
- `rds build [--meta]`: Builds the app for production
- `rds (serve|preview) [--host] [--open] [--port <number>]`: Serves the production build

## Defaults

- `index.html` should be in `/public` without referencing any source file.
- `src/index.tsx` is the App entry point

## Configuration

The (optional) configuration file should be named `rds.config.ts`.

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

- plugins
- workers
