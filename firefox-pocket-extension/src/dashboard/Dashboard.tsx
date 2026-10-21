import React, { useState, useMemo, useCallback } from 'react';
import { SavedItem, ItemStatus } from '../utils/types';
import { useItems } from './useItems';
import { useModal } from './useModal';
import { useSettings } from './useSettings';
import { Sidebar, ViewType } from './Sidebar';
import { ItemGrid, ItemActions } from './ItemGrid';
import { DiscoverView } from './DiscoverView';
import { CollectionsView } from './CollectionsView';
import { SettingsView } from './SettingsView';
import { EditItemModal } from './EditItemModal';
import './index.css';

export type { ViewType };

const TITLES: Record<ViewType, string> = {
    home: 'Minha Lista', favorites: 'Favoritos', archive: 'Arquivo',
    discover: 'Redescobrir', collections: 'Coleções', settings: 'Configurações',
};
const SEARCHABLE: ViewType[] = ['home', 'favorites', 'archive', 'collections'];

const matchesView = (item: SavedItem, view: ViewType) =>
    view === 'home' ? item.status === ItemStatus.Unread
        : view === 'favorites' ? item.isFavorite
            : view === 'archive' ? item.status === ItemStatus.Archived
                : true;

const Dashboard = () => {
    const { items, loadItems, importProgress, setImportProgress, updateItem, toggleFavorite, toggleArchive, deleteItem, swallow } = useItems();
    const { openModal, closeModal, modalElement } = useModal();
    const settings = useSettings();
    const [activeView, setActiveView] = useState<ViewType>('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [navKey, setNavKey] = useState(0);
    const [editingItem, setEditingItem] = useState<SavedItem | null>(null);

    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        swallow(e);
        openModal('Excluir Item', 'Tem certeza que deseja excluir este item permanentemente?', 'danger',
            async () => { await deleteItem(id); closeModal(); }, 'Excluir');
    }, [openModal, closeModal, deleteItem, swallow]);

    const handleEdit = useCallback((e: React.MouseEvent, item: SavedItem) => {
        swallow(e);
        setEditingItem(item);
    }, [swallow]);

    const handleSaveEdit = async (item: SavedItem, tags: string[], folder: string) => {
        try {
            await updateItem(item.id, { tags, aiFolder: folder });
            setEditingItem(null);
        } catch (e) {
            console.error('Failed to update item', e);
            openModal('Erro', 'Falha ao atualizar item.', 'danger');
        }
    };

    const changeView = (view: ViewType) => {
        setActiveView(view);
        setNavKey(k => k + 1); // remounts views so folder/tag selection resets
        setSearchQuery('');
    };

    const matches = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return items.filter(i => matchesView(i, activeView) && (!q || i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q)));
    }, [items, activeView, searchQuery]);

    const actions: ItemActions = { onToggleFavorite: toggleFavorite, onToggleArchive: toggleArchive, onDelete: handleDelete, onEdit: handleEdit };

    const renderContent = () => {
        if (activeView === 'discover') return <DiscoverView key={navKey} items={items} />;
        if (activeView === 'collections') {
            return <CollectionsView key={navKey} items={items} matches={matches} searchQuery={searchQuery} actions={actions} onClearSearch={() => setSearchQuery('')} />;
        }
        if (activeView === 'settings') {
            return (
                <SettingsView settings={settings} items={items} progress={importProgress} onProgress={setImportProgress}
                    openModal={openModal} reload={loadItems} onOrganized={() => changeView('collections')} />
            );
        }
        if (matches.length === 0) {
            return (
                <div className="empty-state">
                    <h2>Nenhum item encontrado</h2>
                    <p>Salve alguns links para começar!</p>
                </div>
            );
        }
        return <ItemGrid items={matches} actions={actions} />;
    };

    return (
        <div className="dashboard-container">
            <Sidebar activeView={activeView} onChange={changeView} />
            <main className="main-content">
                <header className="header">
                    <h1 className="page-title">{TITLES[activeView]}</h1>
                    {SEARCHABLE.includes(activeView) && (
                        <input type="search" className="search-bar" placeholder="Pesquisar..." aria-label="Pesquisar"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    )}
                </header>
                {renderContent()}
                <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} />
                {modalElement}
            </main>
        </div>
    );
};

export default Dashboard;
