# Pocket-like Extension

Uma extensão para Firefox similar ao Pocket, focada em privacidade e armazenamento local.

## Funcionalidades

- **Salvar Links:** Salve qualquer página via botão da extensão ou menu de contexto.
- **Metadados:** Extrai automaticamente título, descrição, imagem e autor.
- **Organização:** Adicione tags, arquive itens ou marque como favoritos.
- **Painel:** Visualize seus itens em uma grade bonita, filtre por tags (Coleções) ou status.
- **Redescobrir:** Sugere um item não lido aleatório da sua lista.
- **Privacidade:** Todos os dados são armazenados localmente no seu navegador (`browser.storage.local`).
- **Exportação:** Exporte seus dados para JSON.

## Instalação (Desenvolvimento)

1. Instale as dependências:
   ```bash
   pnpm install
   ```

2. Compile a extensão:
   ```bash
   pnpm run build
   ```

3. Carregue no Firefox:
   - Abra `about:debugging`.
   - Clique em "Este Firefox".
   - Clique em "Carregar manifesto temporário...".
   - Selecione o arquivo `dist/manifest.json`.

## Tecnologias

- React
- TypeScript
- Webpack
- WebExtension Polyfill
