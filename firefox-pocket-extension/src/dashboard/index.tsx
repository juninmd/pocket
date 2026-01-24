import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';
import { Modal } from '../components/Modal';
import { buildFolderTree, FolderNode } from '../utils/folderStructure';
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
    const [isImporting, setIsImporting] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

    // Derived state for foldertree
    const folderTree = React.useMemo(() => buildFolderTree(items), [items]);

    const getCurrentFolderNode = (): FolderNode | null => {
        if (!selectedFolder) return null;
        const parts = selectedFolder.split('/');
        let current: any = folderTree; // Start at root (which is Record<string, FolderNode>)

        for (const part of parts) {
            if (current[part]) {
                current = current[part].children; // Use children for next iteration if we are traversing
            } else {
                // If we can't find the path (maybe items changed), return null
                return null;
            }
        }
        // Wait, the structure is: root = { "Tech": { children: { "JS": ... } } }
        // The loop above logic is slightly wrong for returning the node itself.

        let currentNode: FolderNode | null = null;
        let currentLevel = folderTree;

        for (const part of parts) {
            if (currentLevel[part]) {
                currentNode = currentLevel[part];
                currentLevel = currentNode.children;
            } else {
                return null;
            }
        }
        return currentNode;
    };

    // Breadcrumbs helper
    const getBreadcrumbs = () => {
        if (!selectedFolder) return [];
        const parts = selectedFolder.split('/');
        let path = '';
        return parts.map(part => {
            path = path ? `${path}/${part}` : part;
            return { name: part, path };
        });
    };

    // Modal State
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        content: React.ReactNode;
        type?: 'default' | 'danger' | 'success';
        onConfirm?: () => void;
        confirmText?: string;
    }>({ isOpen: false, title: '', content: null });

    const openModal = (title: string, content: React.ReactNode, type: 'default' | 'danger' | 'success' = 'default', onConfirm?: () => void, confirmText = 'Confirmar') => {
        setModal({ isOpen: true, title, content, type, onConfirm, confirmText });
    };

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

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
        openModal(
            'Excluir Item',
            'Tem certeza que deseja excluir este item permanentemente?',
            'danger',
            async () => {
                await browser.runtime.sendMessage({ action: 'deleteLink', payload: { id } });
                loadItems();
                closeModal();
            },
            'Excluir'
        );
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
        const exportData = items.map(item => ({
            ...item,
            folder: item.aiFolder || item.originalFolder || 'Uncategorized'
        }));
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", "pocket_like_organized.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const res = await browser.runtime.sendMessage({ action: 'importBookmarks' }) as any;
            if (res.success) {
                openModal('Sucesso', `${res.count} favoritos importados!`, 'success');
                loadItems();
            }
        } catch (e) {
            console.error(e);
            openModal('Erro', 'Falha ao importar favoritos.', 'danger');
        } finally {
            setIsImporting(false);
        }
    };

    const handleOrganizeAI = async () => {
        if (!apiKey) {
            openModal('Configuração Necessária', 'Por favor, configure a chave da API Gemini primeiro nas Configurações.', 'default');
            return;
        }
        if (items.length === 0) {
            openModal('Ops!', 'Nenhum item para organizar. Salve alguns links primeiro!', 'default');
            return;
        }
        setIsOrganizing(true);
        try {
            // Preview First
            const response = await browser.runtime.sendMessage({
                action: 'previewOrganization',
                payload: { apiKey }
            }) as { success: boolean, items: SavedItem[] };

            if (response.success && response.items) {
                const organizedItems = response.items;

                // Calculate stats for preview
                const folders: Record<string, number> = {};
                organizedItems.forEach(item => {
                    const folder = item.aiFolder || 'Outros';
                    folders[folder] = (folders[folder] || 0) + 1;
                });

                const sortedFolders = Object.entries(folders).sort((a, b) => b[1] - a[1]);

                openModal(
                    'Prévia da Organização',
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <p>A IA sugeriu a seguinte estrutura para seus {items.length} itens:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginTop: '14px' }}>
                            {sortedFolders.map(([folder, count]) => (
                                <React.Fragment key={folder}>
                                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>📁 {folder}</div>
                                    <div style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{count} itens</div>
                                </React.Fragment>
                            ))}
                        </div>
                        <p style={{ marginTop: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Deseja aplicar estas mudanças?</p>
                    </div>,
                    'default',
                    async () => {
                        await browser.runtime.sendMessage({
                            action: 'applyOrganization',
                            payload: { items: organizedItems }
                        });
                        alert('Organização aplicada com sucesso!');
                        loadItems();
                        setActiveView('collections');
                        closeModal();
                    },
                    'Aplicar Mudanças'
                );
            }
        } catch (e) {
            console.error(e);
            openModal('Erro', 'Falha ao gerar prévia da organização.', 'danger');
        } finally {
            setIsOrganizing(false);
        }
    };

    const handleExportToFirefox = async () => {
        setIsExporting(true);
        try {
            const res = await browser.runtime.sendMessage({ action: 'exportToFirefox' }) as any;
            if (res.success) {
                openModal('Sucesso', `${res.count} favoritos exportados para o Firefox!`, 'success');
            }
        } catch (e) {
            console.error(e);
            openModal('Erro', 'Falha ao exportar, verifique o console do browser.', 'danger');
        } finally {
            setIsExporting(false);
        }
    };

    const handleViewChange = (view: ViewType) => {
        setActiveView(view);
        setSelectedTag(null);
        setSelectedFolder(null); // Reset folder selection
        setSearchQuery('');
    };

    const handleFolderClick = (folderPath: string) => {
        setSelectedFolder(folderPath); // folderPath should be full path e.g. "Tech/JS"
        setSearchQuery('');
    };

    // Helper to get direct items in the current folder ONLY (not subfolders) logic for display
    const getItemsInCurrentFolder = () => {
        if (!selectedFolder) return [];
        return items.filter(item => {
            const itemFolder = item.aiFolder || item.originalFolder || 'Outros';
            return itemFolder === selectedFolder;
        });
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
                return item.tags && (item.tags.includes(selectedTag) || item.aiTags?.includes(selectedTag));
            }
            if (activeView === 'collections' && selectedFolder) {
                // In collections view with a folder, we might want to just show items IN this specific folder
                // filtering is handled in renderContent now for hierarchy, but if user uses Search bar,
                // we might want global search? Or search within folder?
                // Let's keep global search behavior if query exists.
                if (searchQuery) return true;

                // If just viewing folder, we handle that in renderContent to split folders vs items
                return true;
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
        items.forEach(item => {
            item.tags && item.tags.forEach(tag => tags.add(tag));
            item.aiTags && item.aiTags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    };

    const getUniqueFolders = () => {
        const folders = new Set<string>();
        items.forEach(item => {
            if (item.aiFolder) folders.add(item.aiFolder);
            else if (item.originalFolder) folders.add(item.originalFolder);
        });
        return Array.from(folders).sort();
    };

    // Helper to render individual item card (extracted to reuse)
    const renderItemCard = (item: SavedItem) => {
        const readerUrl = `reader.html?id=${item.id}`;
        const hasContent = !!item.content;

        return (
            <div className="card" key={item.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <a href={hasContent ? readerUrl : item.url} target={hasContent ? "_self" : "_blank"} rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="card-image" style={{ backgroundImage: `url(${item.snapshotUrl || item.imageUrl || 'https://via.placeholder.com/300x160?text=Sem+Imagem'})` }}></div>
                    <div className="card-content">
                        <div className="card-title">{item.title}</div>
                        <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img
                                src={item.favicon || `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=16`}
                                alt=""
                                style={{ width: '16px', height: '16px', borderRadius: '2px' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span>{item.siteName || new URL(item.url).hostname}</span>
                            <span>• {item.estimatedReadTime || 5} min</span>
                            {item.content && <span title="Versão backup disponível" style={{ color: '#4caf50' }}>📖</span>}
                        </div>
                        {item.excerpt && (
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {item.excerpt}
                            </div>
                        )}
                        {/* Tags handling */}
                        {item.tags && item.tags.length > 0 && (
                            <div className="card-tags">
                                {item.tags.map(tag => (
                                    <span key={tag} className="card-tag">{tag}</span>
                                ))}
                                {item.aiTags && item.aiTags.map(tag => (
                                    <span key={`ai-${tag}`} className="card-tag" style={{ border: '1px solid #e0e0e0', background: 'white' }}>✨ {tag}</span>
                                ))}
                            </div>
                        )}
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
        );
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

        if (activeView === 'collections') {
            // If we have a selected tag, show tag view (flat list of items with that tag)
            if (selectedTag) {
                const filtered = items.filter(i => i.tags?.includes(selectedTag) || i.aiTags?.includes(selectedTag));
                return (
                    <div>
                        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button className="btn" onClick={() => setSelectedTag(null)} style={{ background: 'var(--bg-secondary)' }}>← Voltar</button>
                            <h2>#{selectedTag}</h2>
                        </div>
                        <div className="grid">
                            {filtered.map(renderItemCard)}
                        </div>
                    </div>
                )
            }

            // Folder Navigation Logic
            const currentFolderNode = getCurrentFolderNode();
            const subfolders = currentFolderNode ? Object.values(currentFolderNode.children) : Object.values(folderTree);

            // Items directly in this folder (if specific folder selected)
            // If at root (!selectedFolder), we usually don't show loose items unless they have no folder?
            // "Outros" handles loose items usually.

            const directItems = selectedFolder
                ? items.filter(i => (i.aiFolder || i.originalFolder || 'Outros') === selectedFolder)
                : []; // At root, show only folders. Everything should be in a folder (Outros included)

            // Breadcrumbs UI
            const breadcrumbs = getBreadcrumbs();

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Navigation Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {selectedFolder && (
                            <button className="btn" onClick={() => {
                                const parts = selectedFolder.split('/');
                                parts.pop();
                                setSelectedFolder(parts.length > 0 ? parts.join('/') : null);
                            }} style={{ background: 'var(--bg-secondary)', padding: '5px 10px' }}>
                                ⬆ Subir
                            </button>
                        )}

                        <div className="breadcrumbs" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <span
                                onClick={() => setSelectedFolder(null)}
                                style={{ cursor: 'pointer', color: !selectedFolder ? 'var(--primary)' : 'inherit', textDecoration: !selectedFolder ? 'underline' : 'none' }}
                            >
                                Coleções
                            </span>
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={crumb.path}>
                                    <span>/</span>
                                    <span
                                        onClick={() => setSelectedFolder(crumb.path)}
                                        style={{
                                            cursor: 'pointer',
                                            color: idx === breadcrumbs.length - 1 ? 'var(--primary)' : 'inherit',
                                            fontWeight: idx === breadcrumbs.length - 1 ? 'bold' : 'normal'
                                        }}
                                    >
                                        {crumb.name}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Subfolders Grid */}
                    {subfolders.length > 0 && (
                        <div>
                            <h3 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                                {selectedFolder ? 'Subpastas' : 'Minhas Coleções'}
                            </h3>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                                {subfolders.map(node => (
                                    <div
                                        key={node.fullPath}
                                        className="card"
                                        onClick={() => handleFolderClick(node.fullPath)}
                                        style={{ cursor: 'pointer', padding: '20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                                    >
                                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📁</div>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{node.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0', fontSize: '0.9rem' }}>
                                            {node.totalItemCount} itens
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Direct Items Grid */}
                    {directItems.length > 0 && (
                        <div>
                            <h3 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                                Itens em "{breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : '...'} "
                            </h3>
                            <div className="grid">
                                {directItems.map(renderItemCard)}
                            </div>
                        </div>
                    )}

                    {/* Tags Section - Only show at Root */}
                    {!selectedFolder && (
                        <div>
                            <h3 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Explorar por Tags</h3>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                                {getUniqueTags().map(tag => (
                                    <div key={tag} className="card" onClick={() => setSelectedTag(tag)} style={{ cursor: 'pointer', padding: '15px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '1rem', margin: 0 }}>#{tag}</h3>
                                        <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0', fontSize: '0.8rem' }}>
                                            {items.filter(i => (i.tags && i.tags.includes(tag)) || (i.aiTags && i.aiTags.includes(tag))).length}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {subfolders.length === 0 && directItems.length === 0 && selectedFolder && (
                        <div className="empty-state">
                            <p>Esta pasta está vazia.</p>
                        </div>
                    )}

                </div>
            );
        }

        if (activeView === 'settings') {
            return (
                <div style={{ maxWidth: '600px' }}>
                    <div className="card" style={{ padding: '24px' }}>
                        <h2>Configurações</h2>

                        <div style={{ marginBottom: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
                            <h3>Inteligência Artificial (Gemini)</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Adicione sua chave de API do Gemini para habilitar resumos automáticos.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Cole sua API Key aqui"
                                    className="search-bar"
                                    style={{ flex: 1, borderRadius: '8px' }}
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
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button className="btn" onClick={handleImport} disabled={isImporting} style={{ padding: '10px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    {isImporting ? 'Importando...' : '📥 Importar Favoritos do Firefox'}
                                </button>
                                <button className="btn" onClick={handleOrganizeAI} disabled={isOrganizing} style={{ padding: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    {isOrganizing ? 'Organizando...' : '✨ Organizar TUDO com IA'}
                                </button>
                                <button className="btn" onClick={handleExport} style={{ padding: '10px', cursor: 'pointer', background: '#eee', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    📤 Exportar (JSON)
                                </button>
                                <button className="btn" onClick={handleExportToFirefox} disabled={isExporting} style={{ padding: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa502 100%)', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    {isExporting ? 'Exportando...' : '🦊 Exportar para Firefox'}
                                </button>
                            </div>
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
                {filteredItems.map(renderItemCard)}
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
                        {activeView === 'collections' && 'Coleções'}
                        {activeView === 'settings' && 'Configurações'}
                    </h1>
                    {/* Search bar logic updated to only show if not in deep collection navigation unless we want it? keeping it simple for now */}
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

                {/* Modal logic remains the same */}
                <Modal
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    title={modal.title}
                    type={modal.type}
                    footer={
                        modal.onConfirm ? (
                            <>
                                <button className="secondary-btn" onClick={closeModal}>Cancelar</button>
                                <button className="primary-btn" onClick={modal.onConfirm}>{modal.confirmText}</button>
                            </>
                        ) : (
                            <button className="primary-btn" onClick={closeModal}>OK</button>
                        )
                    }
                >
                    {modal.content}
                </Modal>
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
