# Pocket-like Extension

![Status: Finalizado](https://img.shields.io/badge/Status-Finalizado-success)

Uma extensão para Firefox similar ao Pocket, focada em privacidade, leitura offline e organização com IA.

## Funcionalidades

- **Salvar Links:** Salve qualquer página via botão da extensão ou menu de contexto.
- **Leitor Imersivo:** Leitura sem distrações, com modo escuro e TTS (Text-to-Speech).
- **Inteligência Artificial (Gemini):**
  - **Resumos Automáticos:** Obtenha os pontos principais de qualquer artigo.
  - **Chat com o Artigo:** Tire dúvidas sobre o conteúdo diretamente na barra lateral.
  - **Organização Inteligente:** A IA categoriza seus itens em pastas e tags automaticamente.
- **Metadados:** Extrai automaticamente título, descrição, imagem e autor.
- **Organização:** Adicione tags, arquive itens ou marque como favoritos.
- **Painel:** Visualize seus itens em uma grade bonita, filtre por tags (Coleções) ou status.
- **Redescobrir:** Sugere um item não lido aleatório da sua lista.
- **Privacidade:** Todos os dados são armazenados localmente no seu navegador (`browser.storage.local`).
- **Exportação:** Exporte seus dados para JSON ou para o Firefox.

## Configuração de IA (Opcional)

Para utilizar os recursos de Inteligência Artificial (Resumo, Chat, Organização), você precisa de uma API Key do Google Gemini:

1. Obtenha sua chave gratuita em [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Na extensão, vá para **Configurações**.
3. Insira sua chave no campo "Inteligência Artificial (Gemini)".

*Nota: A chave é salva apenas localmente no seu navegador.*

## Instalação (Desenvolvimento)

1. Instale as dependências:
   ```bash
   pnpm install
   ```

2. Compile a extensão (Modo Produção):
   ```bash
   pnpm run build:prod
   ```

3. Carregue no Firefox:
   - Abra `about:debugging`.
   - Clique em "Este Firefox".
   - Clique em "Carregar manifesto temporário...".
   - Selecione o arquivo `dist/manifest.json`.

## Empacotamento

Para criar o arquivo `.zip` final para distribuição:

```bash
pnpm run package
```
O arquivo será gerado na pasta `web-ext-artifacts/`.

## Tecnologias

- React 19
- TypeScript
- Webpack
- WebExtension Polyfill
- Google Gemini API
