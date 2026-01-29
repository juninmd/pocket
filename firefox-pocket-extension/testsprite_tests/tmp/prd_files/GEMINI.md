# GEMINI.md - Project Manifesto

## 1. Project Identity
**Type:** Firefox Browser Extension (WebExtension)
**Name:** Firefox Pocket-like Extension
**Goal:** Create the most premium, privacy-focused "read later" experience for Firefox users.

## 2. Core Constraints & Rules
- **Platform:** **FIREFOX ONLY**. All code must be compatible with Gecko engine.
- **API Standard:** Use `webextension-polyfill` (`browser` namespace) for all extension APIs.
- **Privacy:** Data lives in `browser.storage.local`. No external database.
- **Styling:** **PREMIUM GLASSMORPHISM**.
    - No basic UI.
    - Use `theme.common.css` variables.
    - Animate everything (Framer Motion).

## 3. Technology Stack
- **Framework:** React 19
- **Language:** TypeScript (Strict Mode)
- **Bundler:** Webpack 5
- **Styling:** CSS Modules / Custom CSS Variables (Tailwind-like utility classes in `index.css` + `clsx`)
- **Animation:** Framer Motion

## 4. Key Features (The "Wow" Factor)
- **Native TTS:** Browser-native Text-to-Speech player.
- **Reading Progress:** Visual scroll tracker.
- **Glassmorphism:** Translucent, blurred UI elements.
- **AI Summary:** Gemini integration (User API Key).

## 5. Development Workflow
1.  **Modify:** Edit React components in `src/`.
2.  **Build:** Run `npm run build` (or `pnpm run build`).
3.  **Verify:** Load `dist/manifest.json` in `about:debugging` in Firefox.

## 6. Project structure
- `src/background`: Service workers.
- `src/content`: Content scripts (parsing).
- `src/popup`: Extension popup UI.
- `src/dashboard`: Full-page management UI.
- `src/reader`: Distraction-free reading view.
