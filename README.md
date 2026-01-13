# Extensão Pocket-like para Firefox

Este README descreve as funcionalidades essenciais para desenvolver uma extensão de navegador semelhante ao Pocket do Firefox, com base nas capturas de tela fornecidas.

## Funcionalidades Principais

### 1. Salvar Links (Core Functionality)
*   **Botão/Ícone na Barra de Ferramentas:** Um ícone na barra de ferramentas do navegador para salvar rapidamente a página atual.
*   **Menu de Contexto:** Opção "Salvar no Pocket" ao clicar com o botão direito em um link ou na página.
*   **Página de Confirmação/Edição:** Após salvar, uma pequena janela ou notificação para adicionar tags, arquivar ou favoritar o item imediatamente.

### 2. Interface do Usuário (UI)

#### 2.1. Página Inicial (Home)
*   **Layout:** Exibição de cards ou lista para os conteúdos.
*   **Conteúdos Guardados Recentemente:** Seção destacada com os últimos links salvos, incluindo título, URL, imagem de destaque e tempo estimado de leitura.
*   **Pocket-Worthy Reads:** Seção com recomendações de leitura curadas ou populares, apresentadas de forma visualmente atraente.
*   **Saudação Personalizada:** Mensagem de boas-vindas ao usuário (ex: "Boa noite, Antonio!").
*   **Botão "Ir para Guardado":** Atalho para a seção de itens salvos.

#### 2.2. Guardados (Saved)
*   **Lista de Conteúdos Guardados:** Visualização principal de todos os itens salvos.
*   **Filtros Visuais:**
    *   **Barra Lateral de Navegação:** Opções como "Página Inicial", "Guardados", "Descobrir", "Coleções".
    *   **Filtros de Status:** "Arquivar", "Favoritos", "Destaques".
    *   **Filtros de Tipo:** "Artigos", "Vídeos".
    *   **Etiquetas (Tags):** Lista de tags para filtrar conteúdos.
*   **Criação de Coleções:** Botão "+ Create Collection" para organizar itens em grupos personalizados.
*   **Opções de Visualização:** Ícones para alternar entre diferentes layouts de exibição (ex: lista compacta, grade com detalhes).

#### 2.3. Descobrir (Discover)
*   **Leituras Essenciais:** Seção com cards de artigos e links recomendados, com títulos, descrições e fontes.
*   **Histórias Interessantes:** Conteúdo adicional para exploração, com um banner explicativo sobre a proposta do Pocket.

#### 2.4. Coleções (Collections)
*   **Exibição de Coleções:** Cards ou lista das coleções criadas pelo usuário e "Guias Selecionados" (coleções curadas).

#### 2.5. Exportar (Export)
*   **Interface Simples:** Opção clara para exportar os dados guardados (formato a ser definido, ex: HTML, JSON).

#### 2.6. Perfil e Configurações (Profile & Settings)
*   **Menu Dropdown do Perfil:** Acessível através do ícone do usuário no canto superior direito.
*   **Informações do Usuário:** Exibição do nome e e-mail do usuário.
*   **Opções de Conta:** "Ver Perfil", "Gerenciar perfil", "Obter Ajuda", "Terminar sessão".
*   **Seleção de Temas:** Botões de rádio para "Claro", "Escuro", "Sépia", "System".
*   **Opções de Layout Padrão:** Ícones para escolher o layout de exibição padrão dos conteúdos.

#### 2.7. Elementos Comuns da UI
*   **Barra de Navegação Superior:** Contém o logo "pocket", links de navegação ("Página Inicial", "Guardados", "Descobrir", "Coleções", "Exportar"), ícone de pesquisa e ícone de perfil.
*   **Ações por Item:** Para cada item guardado, ícones de "Curtir" (polegar para cima), "Descurtir" (polegar para baixo), "Guardar" (coração ou ícone de salvar) e um menu de "Mais opções" (representado por reticências).
*   **Pesquisa:** Campo de busca acessível na barra superior.

## Tecnologias Sugeridas (TypeScript, pnpm, Windows)

*   **Linguagem:** TypeScript
*   **Gerenciador de Pacotes:** pnpm
*   **Ambiente de Desenvolvimento:** Compatível com Windows
*   **Framework UI:** React, Vue ou Svelte (a ser definido)
*   **Armazenamento de Dados:** API de armazenamento do navegador (IndexedDB, LocalStorage) ou uma solução de backend leve para sincronização.
*   **Empacotamento da Extensão:** Webpack ou Vite para compilar o código da extensão.

## Próximos Passos

1.  Definir a arquitetura da extensão (background script, content script, popup, options page).
2.  Configurar o ambiente de desenvolvimento com TypeScript e pnpm.
3.  Implementar a funcionalidade de salvar e recuperar artigos.
4.  Desenvolver a interface do usuário para as diferentes seções.
5.  Adicionar as opções de filtragem e organização.
6.  Implementar a gestão de perfil e temas.
