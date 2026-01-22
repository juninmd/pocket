import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';
import './index.css';

// Define filter types
type ViewType = 'home' | 'favorites' | 'archive' | 'discover' | 'collections' | 'settings';

const Dashboard = () => {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [activeView, setActiveView] = useState<ViewType>('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [isSavingKey, setIsSavingKey] = useState(false);

    useEffect(() => {
        loadItems();
        loadApiKey();

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

    const loadApiKey = async () => {
        const data = await browser.storage.local.get('geminiApiKey') as { geminiApiKey?: string };
        if (data.geminiApiKey) {
            setApiKey(data.geminiApiKey);
        }
    };

    const handleSaveApiKey = async () => {
        setIsSavingKey(true);
        await browser.storage.local.set({ geminiApiKey: apiKey });
        setTimeout(() => setIsSavingKey(false), 1000);
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

    const handleViewChange = (view: ViewType) => {
        setActiveView(view);
        setSelectedTag(null);
        setSearchQuery('');
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
            if (activeView === 'collections' && selectedTag) {
                return item.tags && item.tags.includes(selectedTag);
            }
            return true;
        }).filter(item => {
            // Search
            if (!searchQuery) return true;
            return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.url.toLowerCase().includes(searchQuery.toLowerCase());
        });
    };

    const getUniqueTags = () => {
        const tags = new Set<string>();
        items.forEach(item => item.tags && item.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    };

    const renderContent = () => {
        if (activeView === 'discover') {
            const unreadItems = items.filter(i => i.status === ItemStatus.Unread);
            if (unreadItems.length === 0) {
                return <div className="empty-state"><h2>Sem itens para redescobrir</h2><p>Salve mais itens!</p></div>;
            }
            const randomItem = unreadItems[Math.floor(Math.random() * unreadItems.length)];
            return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
                        <a href={randomItem.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <div className="card-image" style={{ height: '300px', backgroundImage: `url(${randomItem.imageUrl || 'https://via.placeholder.com/600x300?text=Sem+Imagem'})` }}></div>
                            <div className="card-content">
                                <div style={{ color: '#ef4056', fontWeight: 'bold', marginBottom: '10px' }}>REDESCOBRIR</div>
                                <div className="card-title" style={{ fontSize: '1.5rem' }}>{randomItem.title}</div>
                                <div className="card-meta">{randomItem.siteName || new URL(randomItem.url).hostname} • {randomItem.estimatedReadTime || 5} min</div>
                                {randomItem.excerpt && <p style={{ lineHeight: '1.6', color: '#555' }}>{randomItem.excerpt}</p>}
                            </div>
                        </a>
                        <div className="card-content" style={{ borderTop: '1px solid #eee' }}>
                            <button className="btn" onClick={() => handleViewChange('discover')} style={{ width: '100%', padding: '12px', background: '#ef4056', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>Próximo Item</button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeView === 'collections' && !selectedTag) {
            const tags = getUniqueTags();
            if (tags.length === 0) {
                return (
                    <div className="empty-state">
                        <h2>Nenhuma coleção encontrada</h2>
                        <p>Adicione tags aos seus itens para criar coleções.</p>
                    </div>
                );
            }
            return (
                <div className="grid">
                    {tags.map(tag => (
                        <div key={tag} className="card" onClick={() => setSelectedTag(tag)} style={{ cursor: 'pointer', padding: '30px', alignItems: 'center', justifyContent: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>#{tag}</h3>
                            <p style={{ color: '#888' }}>{items.filter(i => i.tags && i.tags.includes(tag)).length} itens</p>
                        </div>
                    ))}
                </div>
            );
        }

        if (activeView === 'settings') {
            return (
                <div style={{ maxWidth: '600px' }}>
                    <div className="card-content" style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
                        <h2>Configurações</h2>

                        <div style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                            <h3>Inteligência Artificial (Gemini)</h3>
                            <p style={{ color: '#666', marginBottom: '10px' }}>Adicione sua chave de API do Gemini para habilitar resumos automáticos.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole sua API Key aqui"
                                    style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                                <button
                                    className="btn"
                                    onClick={handleSaveApiKey}
                                    style={{
                                        padding: '10px 20px',
                                        background: isSavingKey ? '#4caf50' : '#ef4056',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isSavingKey ? 'Salvo!' : 'Salvar Key'}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#ef4056' }}>Obter chave de API gratuita</a>
                            </p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3>Gerenciamento de Dados</h3>
                            <button className="btn" onClick={handleExport} style={{ padding: '10px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>Exportar Itens Salvos (JSON)</button>
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
                    <p>{selectedTag ? `Nenhum item com a tag #${selectedTag}` : 'Salve alguns links para começar!'}</p>
                    {selectedTag && <button onClick={() => setSelectedTag(null)} style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}>Voltar para Coleções</button>}
                </div>
            );
        }

        return (
            <div className="grid">
                {filteredItems.map(item => {
                    const readerUrl = `reader.html?id=${item.id}`;
                    const hasContent = !!item.content;

                    return (
                        <div className="card" key={item.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <a href={hasContent ? readerUrl : item.url} target={hasContent ? "_self" : "_blank"} rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="card-image" style={{ backgroundImage: `url(${item.imageUrl || 'https://via.placeholder.com/300x160?text=Sem+Imagem'})` }}></div>
                                <div className="card-content">
                                    <div className="card-title">{item.title}</div>
                                    <div className="card-meta">
                                        {item.siteName || new URL(item.url).hostname} • {item.estimatedReadTime || 5} min
                                        {item.author && <span> • {item.author}</span>}
                                    </div>
                                    {item.excerpt && (
                                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {item.excerpt}
                                        </div>
                                    )}
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="card-tags">
                                            {item.tags.map(tag => (
                                                <span key={tag} className="card-tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Spacer to push actions to bottom if needed, but flex handles it */}
                                    <div style={{ flex: 1 }}></div>

                                    <div className="card-actions" onClick={(e) => e.preventDefault()}>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="icon-btn"
                                            title="Abrir original"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            🔗
                                        </a>
                                        <button
                                            className="icon-btn"
                                            title={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                                            onClick={(e) => handleToggleFavorite(e, item.id, item.isFavorite)}
                                            style={{ color: item.isFavorite ? 'orange' : '' }}
                                        >
                                            ★
                                        </button>
                                        <button
                                            className="icon-btn"
                                            title={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                                            onClick={(e) => handleToggleArchive(e, item.id, item.status)}
                                            style={{ color: item.status === ItemStatus.Archived ? 'green' : '' }}
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
                        </div>
                    )
                })}
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <div className="logo">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4056" style={{ marginRight: '10px' }}>
                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                    </svg>
                    pocket-like
                </div>
                <div className={`nav-item ${activeView === 'home' ? 'active' : ''}`} onClick={() => handleViewChange('home')}>Início</div>
                <div className={`nav-item ${activeView === 'favorites' ? 'active' : ''}`} onClick={() => handleViewChange('favorites')}>Favoritos</div>
                <div className={`nav-item ${activeView === 'archive' ? 'active' : ''}`} onClick={() => handleViewChange('archive')}>Arquivo</div>
                <div className="nav-divider"></div>
                <div className={`nav-item ${activeView === 'discover' ? 'active' : ''}`} onClick={() => handleViewChange('discover')}>Redescobrir</div>
                <div className={`nav-item ${activeView === 'collections' ? 'active' : ''}`} onClick={() => handleViewChange('collections')}>Coleções</div>
                <div className="nav-divider"></div>
                <div className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => handleViewChange('settings')}>Configurações</div>
            </div>

            <div className="main-content">
                <div className="header">
                    <h1 className="page-title">
                        {activeView === 'home' && 'Minha Lista'}
                        {activeView === 'favorites' && 'Favoritos'}
                        {activeView === 'archive' && 'Arquivo'}
                        {activeView === 'discover' && 'Redescobrir'}
                        {activeView === 'collections' && (selectedTag ? `Coleção #${selectedTag}` : 'Coleções')}
                        {activeView === 'settings' && 'Configurações'}
                    </h1>
                    {['home', 'favorites', 'archive', 'collections'].includes(activeView) && (
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
