# AGENTS.md

Pocket: a privacy-focused "read later" extension for Firefox (WebExtension, React 19, TypeScript). All code lives in `firefox-pocket-extension/`. The root holds docs, CI and the roadmap.

**Read first:** `firefox-pocket-extension/GEMINI.md` is the project manifesto (constraints, styling, workflow).

## Stack
- Firefox only (Gecko). Extension APIs go through `webextension-polyfill`
- React 19, TypeScript (strict), Webpack 5, Jest with jsdom, Framer Motion, Tailwind-style utility classes in `index.css`, `clsx`
- pnpm 10.34.5 (`packageManager`), lockfile `pnpm-lock.yaml`. CI uses Node 20

## Commands
Run inside `firefox-pocket-extension/`:
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build` (dev), `pnpm run build:prod`, watch: `pnpm run watch`
- Test: `pnpm test` (Jest). CI runs `pnpm exec jest --ci`
- Load in Firefox: `pnpm run start:firefox`, or load `dist/manifest.json` in `about:debugging`
- Package: `pnpm run package` (web-ext build from `dist/`)
- Lint: no lint script is configured

## Structure
- `src/background/`: background service worker
- `src/content/`: content script (page parsing)
- `src/popup/`: toolbar popup
- `src/dashboard/`: full-page manager (items, collections, discover, settings)
- `src/reader/`: distraction-free reading view
- `src/components/`, `src/utils/` (storage, saving, AI service and organizer, text helpers), `src/styles/theme.css`
- `__mocks__/`, `jest.setup.ts`: test mocks and setup
- Root: `CONTRIBUTING.md`, `PULL_REQUEST_TEMPLATE.md`, `ROADMAP.md`, `docs/screenshots/`, `.github/workflows/`

## Conventions
- Storage: data lives in `browser.storage.local`. No external database
- JSDoc on every exported function
- Tests: new features and bug fixes ship with tests. Target 100% coverage (`GEMINI.md`, `CONTRIBUTING.md`)
- Styling: premium glassmorphism. Use the CSS variables in `src/styles/theme.css`. No basic UI
- Open PRs against `master`, and fill in `PULL_REQUEST_TEMPLATE.md` (it sits at the root, not in `.github/`)
- Max 150 lines per file (also stated in `README.md`)
- Workflow: Plan -> Act -> Validate. A change is done only with tests passing
- Sensitive data stays out of context

## Gotchas
- The AI summary uses the user's own Gemini API key. Never hardcode it or log it
- `validate.yml` runs on every PR: `pnpm exec jest --ci` and `pnpm run build:prod` in `firefox-pocket-extension/`. `central-validate.yml` calls the base-actions reusable validation
- Do not hand-edit `pnpm-lock.yaml`. Regenerate it with `pnpm install`

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.