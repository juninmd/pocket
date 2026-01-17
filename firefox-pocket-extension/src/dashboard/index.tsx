import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';
import './index.css';

// Define filter types
type ViewType = 'home' | 'favorites' | 'archive' | 'discover' | 'collections' | 'settings';

const MOCK_DISCOVER_ITEMS = [
  {
    id: 'd1',
    title: 'O Futuro do Desenvolvimento Web',
    url: 'https://developer.mozilla.org',
    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=300&q=80',
    hostname: 'developer.mozilla.org',
    readTime: 5
  },
  {
    id: 'd2',
    title: 'Entendendo React Server Components',
    url: 'https://react.dev',
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=300&q=80',
    hostname: 'react.dev',
    readTime: 8
  },
  {
    id: 'd3',
    title: '10 Dicas para um CSS Melhor',
    url: 'https://css-tricks.com',
    imageUrl: 'https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?auto=format&fit=crop&w=300&q=80',
    hostname: 'css-tricks.com',
    readTime: 4
  }
];

const Dashboard = () => {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadItems();

    // Listen for updates from background
    browser.runtime.onMessage.addListener((msg: any) => {
      const message = msg as any;
      if (message.action === 'itemsUpdated') {
        loadItems();
      }
    });
  }, []);

  const loadItems = async () => {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getLinks' }) as { items: SavedItem[] };
      if (response && response.items) {
        setItems(response.items);
      }
    } catch (err) {
      console.error("Failed to load items", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este item?')) {
        await browser.runtime.sendMessage({ action: 'deleteLink', payload: { id } });
        loadItems();
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id, updates: { isFavorite: !isFavorite } }
      });
      loadItems();
  };

  const handleToggleArchive = async (e: React.MouseEvent, id: string, currentStatus: ItemStatus) => {
      e.preventDefault();
      e.stopPropagation();
      const newStatus = currentStatus === ItemStatus.Archived ? ItemStatus.Unread : ItemStatus.Archived;
      await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id, updates: { status: newStatus } }
      });
      loadItems();
  };

  const handleExport = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "pocket_like_export.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const getFilteredItems = () => {
      return items.filter(item => {
          if (activeView === 'home') {
              return item.status === ItemStatus.Unread;
          }
          if (activeView === 'favorites') {
              return item.isFavorite;
          }
          if (activeView === 'archive') {
              return item.status === ItemStatus.Archived;
          }
          return true;
      }).filter(item => {
          // Search
          if (!searchQuery) return true;
          return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.url.toLowerCase().includes(searchQuery.toLowerCase());
      });
  };

  const renderContent = () => {
      if (activeView === 'discover') {
          return (
              <div className="grid">
                  {MOCK_DISCOVER_ITEMS.map(item => (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="card" key={item.id} style={{textDecoration: 'none', color: 'inherit'}}>
                          <div className="card-image" style={{backgroundImage: `url(${item.imageUrl})`}}></div>
                          <div className="card-content">
                              <div className="card-title">{item.title}</div>
                              <div className="card-meta">{item.hostname} • {item.readTime} min</div>
                              <div className="card-actions">
                                  <span style={{fontSize: '0.8rem', color: '#666'}}>Recomendado</span>
                              </div>
                          </div>
                      </a>
                  ))}
              </div>
          );
      }

      if (activeView === 'collections') {
          return (
              <div className="empty-state">
                  <h2>Coleções</h2>
                  <p>Organize seus itens salvos em coleções.</p>
                  <p><em>Em breve na próxima atualização!</em></p>
              </div>
          );
      }

      if (activeView === 'settings') {
          return (
              <div style={{maxWidth: '600px'}}>
                   <div className="card-content" style={{background: 'white', padding: '20px', borderRadius: '8px'}}>
                      <h2>Configurações</h2>
                      <div style={{marginBottom: '20px'}}>
                          <h3>Gerenciamento de Dados</h3>
                          <button className="btn" onClick={handleExport} style={{padding: '10px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px'}}>Exportar Itens Salvos (JSON)</button>
                      </div>
                      <div>
                          <h3>Sobre</h3>
                          <p>Extensão Pocket-like v1.0</p>
                          <p>Uma alternativa focada em privacidade para salvar links.</p>
                      </div>
                   </div>
              </div>
          );
      }

      const filteredItems = getFilteredItems();

      if (filteredItems.length === 0) {
          return (
              <div className="empty-state">
                  <h2>Nenhum item encontrado</h2>
                  <p>Salve alguns links para começar!</p>
              </div>
          );
      }

      return (
          <div className="grid">
              {filteredItems.map(item => (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="card" key={item.id} style={{textDecoration: 'none', color: 'inherit'}}>
                  <div className="card-image" style={{backgroundImage: `url(${item.imageUrl || 'https://via.placeholder.com/300x160?text=Sem+Imagem'})`}}></div>
                  <div className="card-content">
                      <div className="card-title">{item.title}</div>
                      <div className="card-meta">{new URL(item.url).hostname} • {item.estimatedReadTime || 5} min</div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="card-tags">
                            {item.tags.map(tag => (
                                <span key={tag} className="card-tag">{tag}</span>
                            ))}
                        </div>
                      )}
                      <div className="card-actions">
                          <button
                              className="icon-btn"
                              title={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                              onClick={(e) => handleToggleFavorite(e, item.id, item.isFavorite)}
                              style={{color: item.isFavorite ? 'orange' : ''}}
                          >
                              ★
                          </button>
                          <button
                              className="icon-btn"
                              title={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                              onClick={(e) => handleToggleArchive(e, item.id, item.status)}
                              style={{color: item.status === ItemStatus.Archived ? 'green' : ''}}
                          >
                              📥
                          </button>
                           <button
                              className="icon-btn"
                              title="Excluir"
                              onClick={(e) => handleDelete(e, item.id)}
                          >
                              🗑️
                          </button>
                      </div>
                  </div>
                  </a>
              ))}
          </div>
      );
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="logo">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4056" style={{marginRight: '10px'}}>
               <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
             </svg>
            pocket-like
        </div>
        <div className={`nav-item ${activeView === 'home' ? 'active' : ''}`} onClick={() => setActiveView('home')}>Início</div>
        <div className={`nav-item ${activeView === 'favorites' ? 'active' : ''}`} onClick={() => setActiveView('favorites')}>Favoritos</div>
        <div className={`nav-item ${activeView === 'archive' ? 'active' : ''}`} onClick={() => setActiveView('archive')}>Arquivo</div>
        <div className="nav-divider"></div>
        <div className={`nav-item ${activeView === 'discover' ? 'active' : ''}`} onClick={() => setActiveView('discover')}>Descobrir</div>
        <div className={`nav-item ${activeView === 'collections' ? 'active' : ''}`} onClick={() => setActiveView('collections')}>Coleções</div>
        <div className="nav-divider"></div>
        <div className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>Configurações</div>
      </div>

      <div className="main-content">
        <div className="header">
            <h1 className="page-title">
                {activeView === 'home' && 'Minha Lista'}
                {activeView === 'favorites' && 'Favoritos'}
                {activeView === 'archive' && 'Arquivo'}
                {activeView === 'discover' && 'Descobrir'}
                {activeView === 'collections' && 'Coleções'}
                {activeView === 'settings' && 'Configurações'}
            </h1>
            {['home', 'favorites', 'archive'].includes(activeView) && (
                <input
                    type="text"
                    className="search-bar"
                    placeholder="Pesquisar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            )}
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
