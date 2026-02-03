# AGENTS.md

## Repository Overview
This repository contains a Firefox extension designed to be a privacy-focused "read later" tool, similar to Pocket. It is built with React, TypeScript, and Webpack.

## Core Directives for Agents
- **Platform:** Firefox (WebExtension).
- **Style:** Glassmorphism using CSS variables.
- **Privacy:** `browser.storage.local` only.
- **Testing:** Maintain 100% test coverage.

## Future Roadmap
1.  **Syncing:** Implement a mechanism to sync data between devices (possibly using a private cloud or encrypted file export/import) without compromising the "local-first" privacy promise.
2.  **Advanced AI:** Enhance the Gemini integration to support "Chat with Page" functionality, allowing users to ask questions about the saved content.
3.  **Accessibility Audit (Dashboard):** Conduct a full accessibility audit (WCAG 2.1) on the `Dashboard` view. (Note: `Reader` view audit and improvements completed).
4.  **Full Keyboard Navigation:** Ensure every interactive element in the extension is accessible via keyboard, including focus traps for modals and logical tab order.
