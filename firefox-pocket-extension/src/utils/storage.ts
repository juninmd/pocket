import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType } from './types';

export const getSavedItems = async (): Promise<SavedItem[]> => {
  const data = await browser.storage.local.get('savedItems');
  return (data.savedItems as SavedItem[]) || [];
};

export const saveItem = async (item: SavedItem): Promise<void> => {
  const items = await getSavedItems();
  // Check if already exists
  const existingIndex = items.findIndex(i => i.url === item.url);
  if (existingIndex >= 0) {
    // Update existing
    items[existingIndex] = { ...items[existingIndex], ...item };
  } else {
    items.unshift(item); // Add to top
  }
  await browser.storage.local.set({ savedItems: items });
};

export const updateItem = async (id: string, updates: Partial<SavedItem>): Promise<SavedItem | null> => {
  const items = await getSavedItems();
  const index = items.findIndex(i => i.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...updates };
    await browser.storage.local.set({ savedItems: items });
    return items[index];
  }
  return null;
};

export const deleteItem = async (id: string): Promise<void> => {
  const items = await getSavedItems();
  const newItems = items.filter(i => i.id !== id);
  await browser.storage.local.set({ savedItems: newItems });
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
