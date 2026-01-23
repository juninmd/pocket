# GEMINI.md - Project Manifesto

## 1. Project Objective
To create a high-quality, privacy-focused "Pocket-like" extension for Firefox. The app must be 100% functional, visually appealing, and reliable.

## 2. Core Principles
- **Privacy First:** All data is stored locally (`browser.storage.local`). No external servers unless explicitly added.
- **Visual Excellence:** The UI must be modern, responsive, and polished.
- **Functionality:** 
    - Save links with metadata.
    - Organize via tags/collections.
    - Read/Archive/Delete workflow.
- **Code Quality:**
    - TypeScript for type safety.
    - Functional components with React Hooks.
    - No unused code.

## 3. Tech Stack
- **Frontend:** React 19, TypeScript
- **Build Tool:** Webpack
- **Styling:** CSS/SCSS (Loader configured)
- **Extension API:** `webextension-polyfill`

## 4. Development Workflow
1.  **Plan:** Define changes in `implementation_plan.md`.
2.  **Execute:** Implement features/fixes.
3.  **Verify:** Build and test.
