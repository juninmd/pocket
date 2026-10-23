import { useEffect, useState, useCallback } from 'react';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';

type ItemEvent = React.MouseEvent;

const swallow = (e: ItemEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

export const useItems = () => {
    const [items, setItems] = useState<SavedItem[]>([]);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    const loadItems = useCallback(async () => {
        try {
            const response = await browser.runtime.sendMessage({ action: 'getLinks' }) as { items: SavedItem[] };
            if (response && response.items) setItems(response.items);
        } catch (err) {
            console.error('Failed to load items', err);
        }
    }, []);

    useEffect(() => {
        loadItems();
        const listener = (msg: any) => {
            if (msg.action === 'itemsUpdated') loadItems();
            else if (msg.action === 'importProgress') setImportProgress(msg.payload);
        };
        browser.runtime.onMessage.addListener(listener);
        return () => browser.runtime.onMessage.removeListener(listener);
    }, [loadItems]);

    const updateItem = useCallback(async (id: string, updates: Partial<SavedItem>) => {
        await browser.runtime.sendMessage({ action: 'updateLink', payload: { id, updates } });
        loadItems();
    }, [loadItems]);

    const toggleFavorite = useCallback(async (e: ItemEvent, id: string, isFavorite: boolean) => {
        swallow(e);
        await updateItem(id, { isFavorite: !isFavorite });
    }, [updateItem]);

    const toggleArchive = useCallback(async (e: ItemEvent, id: string, status: ItemStatus) => {
        swallow(e);
        const next = status === ItemStatus.Archived ? ItemStatus.Unread : ItemStatus.Archived;
        await updateItem(id, { status: next });
    }, [updateItem]);

    const deleteItem = useCallback(async (id: string) => {
        await browser.runtime.sendMessage({ action: 'deleteLink', payload: { id } });
        loadItems();
    }, [loadItems]);

    return { items, loadItems, importProgress, setImportProgress, updateItem, toggleFavorite, toggleArchive, deleteItem, swallow };
};
