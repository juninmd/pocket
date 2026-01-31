import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType } from './types';

export const getSavedItems = async (): Promise<SavedItem[]> => {
  const data = await browser.storage.local.get('savedItems');
  return (data.savedItems as SavedItem[]) || [];
};

export const getItem = async (id: string): Promise<SavedItem | null> => {
  const items = await getSavedItems();
  const item = items.find(i => i.id === id);
  if (!item) return null;

  // If content is present in metadata (legacy), use it.
  if (item.content) {
    return item;
  }

  // Otherwise, try to fetch it from separate key
  const contentKey = `content_${id}`;
  const data = await browser.storage.local.get(contentKey);
  if (data[contentKey]) {
    return { ...item, content: data[contentKey] as string };
  }

  return item;
};

export const saveItem = async (item: SavedItem): Promise<void> => {
  const items = await getSavedItems();

  // Extract content
  const { content, ...metadata } = item;

  // Save content separately if it exists
  if (content) {
     await browser.storage.local.set({ [`content_${item.id}`]: content });
  }

  // Check if already exists
  const existingIndex = items.findIndex(i => i.url === item.url);
  if (existingIndex >= 0) {
    // Update existing
    // We merge metadata but explicitly remove content from the stored object in the list
    const existing = items[existingIndex];
    items[existingIndex] = { ...existing, ...metadata, content: undefined };
  } else {
    // Add to top
    // Ensure content is undefined in the list
    items.unshift({ ...metadata, content: undefined } as SavedItem);
  }
  await browser.storage.local.set({ savedItems: items });
};

export const updateItem = async (id: string, updates: Partial<SavedItem>): Promise<SavedItem | null> => {
  const items = await getSavedItems();
  const index = items.findIndex(i => i.id === id);
  if (index >= 0) {
    const { content, ...metadataUpdates } = updates;

    // If updating content, save it separately
    if (content !== undefined) {
         await browser.storage.local.set({ [`content_${id}`]: content });
    } else {
        // If legacy item has content in metadata, migrate it to separate storage
        // so we don't lose it when we strip it from metadata below
        if (items[index].content) {
            await browser.storage.local.set({ [`content_${id}`]: items[index].content });
        }
    }

    // Update metadata
    // Remove content from metadata object
    const newItemMetadata = { ...items[index], ...metadataUpdates };
    delete newItemMetadata.content;

    items[index] = newItemMetadata;
    await browser.storage.local.set({ savedItems: items });

    // Return full item
    return getItem(id);
  }
  return null;
};

export const deleteItem = async (id: string): Promise<void> => {
  const items = await getSavedItems();
  const newItems = items.filter(i => i.id !== id);
  await browser.storage.local.set({ savedItems: newItems });
  await browser.storage.local.remove(`content_${id}`);
};

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9);
};
