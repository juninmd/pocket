# Pocket-like

![Firefox](https://img.shields.io/badge/Firefox-WebExtension-ff7139)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tests](https://img.shields.io/badge/tests-266%20passing-brightgreen)

Extensão para Firefox no estilo do Pocket: salve links, leia sem distrações e organize a biblioteca com IA. Os dados ficam só no navegador (`browser.storage.local`).

![Dashboard](docs/screenshots/home.png)

## Funcionalidades

- **Salvar**: botão da extensão, menu de contexto ou atalho `Ctrl+Shift+S`.
- **Metadados automáticos**: título, descrição, imagem, autor e tempo de leitura.
- **Leitor imersivo**: texto limpo (Readability), temas claro/sépia/escuro, barra de progresso e leitura em voz alta (TTS).
- **IA com Gemini** (opcional): resumo, conceitos-chave, chat com o artigo e organização automática em pastas e tags, com prévia antes de aplicar.
- **Dashboard**: Início, Favoritos, Arquivo, Redescobrir (item aleatório não lido) e Coleções (pastas hierárquicas e tags).
- **Importar e exportar**: favoritos do Firefox, JSON e exportação de volta para o Firefox.
- **Privacidade**: sem conta e sem servidor. A chave do Gemini fica só no seu navegador.

| Coleções | Configurações |
|---|---|
| ![Coleções](docs/screenshots/collections.png) | ![Configurações](docs/screenshots/settings.png) |

## Começando

Requisitos: Node 20+ e pnpm (ou npm).

```bash
cd firefox-pocket-extension
pnpm install
pnpm run build:prod
```

Para carregar no Firefox, abra `about:debugging` → *Este Firefox* → *Carregar extensão temporária…* e escolha `dist/manifest.json`.

Para rodar em um perfil de desenvolvimento: `pnpm run start:firefox`.

### Configurar a IA

1. Gere uma chave gratuita no [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Na extensão, abra **Configurações**, cole a chave e escolha o modelo.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm run build` / `build:prod` | Compila para `dist/` |
| `pnpm run watch` | Recompila ao salvar |
| `pnpm test` | Jest com cobertura |
| `pnpm run package` | Gera o `.zip` em `web-ext-artifacts/` |
| `pnpm run start:firefox` | Abre o Firefox com a extensão |

## Estrutura

```text
firefox-pocket-extension/
├── manifest.json
└── src/
    ├── background/   salvar links, importar/exportar, organização com IA
    ├── content/      extração de conteúdo da página
    ├── popup/        popup da extensão
    ├── dashboard/    gerenciamento (views, hooks e modais)
    ├── reader/       leitor, TTS e chat com IA
    ├── components/   ItemCard, Modal, TTSPlayer, ...
    ├── utils/        storage, aiService, aiOrganizer, folderStructure
    └── styles/       tema compartilhado (glassmorphism)
```

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) e [AGENTS.md](AGENTS.md). Regras principais: **máx. 150 linhas por arquivo**, testes e lint passando, e nenhum dado sensível no contexto. O roteiro está em [ROADMAP.md](ROADMAP.md).

## Stack

React 19, TypeScript, Webpack 5, Framer Motion, `@mozilla/readability`, DOMPurify, `webextension-polyfill` e Google Gemini API.
