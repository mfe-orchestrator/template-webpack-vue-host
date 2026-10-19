# Webpack & Vue — host template

Starter template for the [MFE Orchestrator](https://github.com/mfe-orchestrator), listed in the
marketplace as `webpack-host-vue`. Webpack 5 + Vue 3, wired as a **host**.

## Requirements

- Node.js 22.15 or newer (CI builds on Node 24, the current LTS)
- [pnpm](https://pnpm.io) 12 (pinned in `packageManager`; `corepack enable` picks it up)

> [!NOTE]
> The client SDK is published as `@mfe-orchestrator-hub/client` and this template depends on it at
> `^0.3.0`, the first version with `loadWebpackRemote()`. A caret on a `0.x` version is deliberately
> narrow: it accepts `0.3.x` only, **not** `0.4.0`. The SDK is new and parts of its API are still
> settling, so that is the intended level of caution — the cost is that you have to widen this range
> yourself when the SDK moves to `0.4.0`, otherwise `pnpm install` fails to resolve it.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build into dist/
```

## Project structure

```
.
├── .github/workflows/build-and-deploy.yml   # build + upload + Docker image
├── Dockerfile                               # standalone nginx deploy
├── nginx/no-cache.conf
├── public/index.html
├── src/
│   ├── App.vue                              # shell, consumes the example remote
│   ├── components/ManifestPanel.vue          # reads the manifest through the SDK
│   ├── bootstrap.ts
│   └── index.ts                             # configure() lives here
├── .env.example
├── package.json
└── webpack.config.ts                        # federation config
```

## How the orchestrator is wired in

**The host never decides which version it gets.** It hands over the identities it holds and uses
the URL it receives, verbatim. Which version that URL points at — stable, canary, whatever — is
decided by the backend. Nothing in this repo parses a version, builds a URL by hand, or knows that
canaries exist.

Two pieces make that work.

**1. `configure()`, at the very top of the entry point (`src/index.ts`), synchronously, before
anything imports a remote:**

```js
import { configure } from '@mfe-orchestrator-hub/client';

const environment = process.env.MFE_ENVIRONMENT;

configure({
  backendUrl: process.env.MFE_BACKEND_URL,
  projectId: process.env.MFE_PROJECT_ID,
  ...(environment ? { environment } : {}),
});
```

`environment` is optional. The host does not have to know which environment it runs in: when the
key is absent the backend resolves the environment from the domain the request comes from. With
webpack it takes two steps. `webpack.config.ts` substitutes the bare identifier `undefined` when
`MFE_ENVIRONMENT` is unset or empty — it used to fall back to `'DEV'`, which silently pinned every
build that forgot the variable to that environment — and the entry point then drops the key instead
of forwarding a fake slug. Set `MFE_ENVIRONMENT` only when you want to pin the environment
explicitly — for instance when several environments are served from the same domain.

**2. The remote, declared in `webpack.config.ts` as a promise that resolves to the remote's container:**

```js
new ModuleFederationPlugin({
  name: 'host',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/...' },
  remotes: {
    // key: what you import from; 'example-remote': the slug in the orchestrator;
    // 'exampleremote': the scope, the remote's own ModuleFederationPlugin name
    exampleremote: "promise globalThis.__MFE_ORCHESTRATOR__.loadWebpackRemote('example-remote', 'exampleremote')",
  },
  shared: { ... },
})
```

- **The key** (`exampleremote`) is the name you import from: `import('exampleremote/Button')`. It
  needs a matching module declaration in `src/remotes.d.ts`.
- **The slug** (`'example-remote'`) is the frontend in the orchestrator. `loadWebpackRemote()`
  asks the backend for the URL it resolved for that slug, already pinned to a version, injects that
  `remoteEntry.js` once and returns the container. Never write a URL there by hand.
- **The scope** (`'exampleremote'`) is the `name` the remote gives its own `ModuleFederationPlugin`,
  which is how webpack finds the container once the script has run. A remote created by the console
  from a webpack template is named after its slug, slashes to underscores and dashes removed
  (`checkout-new` → `checkoutnew`), the same name the console writes in the configs it generates.
  Left out, it is the `nameToIntegrate` the manifest gives for the slug, which is that same name.

`loadWebpackRemote` is a global because `ModuleFederationPlugin` pastes a `promise` remote into the
bundle verbatim: it cannot import a package. `configure()` publishes it on
`globalThis.__MFE_ORCHESTRATOR__`, which is one more reason it runs first.

Rename the key, the slug and the scope to match your own frontends, and add one entry per
remote.

The SDK also exposes `manifest()`, `globalVariables()` and `identities()`, all used in this
template, so you can see what the environment actually returned.

## Environment variables

Read from the shell at build time and injected by webpack's `DefinePlugin`. See `.env.example`.

| variable | required | what it is |
| --- | --- | --- |
| `MFE_BACKEND_URL` | yes | orchestrator backend, including the `/api` suffix |
| `MFE_PROJECT_ID` | yes | id of your project in the orchestrator |
| `MFE_ENVIRONMENT` | no | environment slug, ex. `DEV`. Omit it, or leave it empty, and the backend resolves the environment from the domain the request comes from |

```bash
MFE_PROJECT_ID=abc123 MFE_ENVIRONMENT=DEV pnpm build   # pinned environment
MFE_PROJECT_ID=abc123 pnpm build                       # resolved by domain
```

`.env` is gitignored. Never commit real values.

Both required values have to reach the bundle: since SDK `0.2`, `configure()` throws at startup
when either is missing or still a placeholder, and the browser console says which one and where to
set it. The page stays blank until then.

## Build output

`pnpm build` writes to `dist/`. The federation entry lands at **`dist/remoteEntry.js`**.

The marketplace entry for this template declares `remoteEntry.js` as its `entryPoint`, because a host is consumable as a remote too; the whole `dist/` folder is what gets uploaded.

Check it after any change to `webpack.config.ts`: the orchestrator serves exactly that path, so a build that
puts the entry somewhere else is broken.

## Deploying

### Upload to the orchestrator

`.github/workflows/build-and-deploy.yml` builds the app and uploads `dist/` with
[`mfe-orchestrator/github-action`](https://github.com/mfe-orchestrator/github-action). It runs on
any pushed tag, or manually via *Run workflow*.

Configure these once, in the repository settings:

| kind | name | value |
| --- | --- | --- |
| secret | `MICROFRONTEND_ORCHESTRATOR_API_KEY` | your orchestrator API key |
| variable | `MICROFRONTEND_SLUG` | the slug of this host in the orchestrator |
| variable | `MICROFRONTEND_ORCHESTRATOR_DOMAIN` | your console URL, optional, defaults to `https://console.mfe-orchestrator.dev` |

The API key is a **secret**, never a variable and never a literal in the workflow file. If you
prefer hardcoding the two per project values instead of using repository variables, replace the
expressions in the `env:` block at the top of the workflow.

### Standalone deploy

A host is consumable as a remote, but it is also an application in its own right, so the same
workflow builds and pushes an nginx image to `ghcr.io/<owner>/<repo>`. `nginx/no-cache.conf` serves
`index.html` for any route and marks the entry files as never cacheable, so a redeploy is picked up
immediately.

```bash
docker build -t my-host .
docker run -p 8080:80 my-host
```

## Notes

- `configure()` runs in `src/index.ts`, before the `import('./bootstrap')` that starts the app. Keep that order: it publishes the `loadWebpackRemote()` the remote declarations call, and a remote must not be resolved before the SDK knows where the backend is.
- `output.publicPath` stays `'auto'`. A classic script derives the base of its chunks from `document.currentScript.src`, which is the URL *before* any redirect, so this is what keeps a version pinned entry loading its own chunks instead of mixing two builds in one page.

## License

MIT
