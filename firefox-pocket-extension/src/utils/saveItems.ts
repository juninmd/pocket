import browser from 'webextension-polyfill';
import { SavedItem } from './types';
import { getSavedItems } from './storage';

/**
 * Bulk version of saveItem: same rules (a known URL keeps its stored id, content goes to
 * content_<id>, new items go on top), but one read and one write for the whole batch.
 * Calling saveItem per bookmark rewrote the full list each time: O(n²) storage traffic on import.
 */
export const saveItems = async (incoming: SavedItem[]): Promise<void> => {
  if (incoming.length === 0) return;
  const items = await getSavedItems();
  const byUrl = new Map(items.map(i => [i.url, i]));
  const added: SavedItem[] = [];
  const contents: Record<string, string> = {};

  for (const item of incoming) {
    const { content, ...metadata } = item;
    const existing = byUrl.get(item.url);
    const id = existing ? existing.id : item.id;
    if (content) contents[`content_${id}`] = content;
    if (existing) {
      Object.assign(existing, metadata, { id, content: undefined });
    } else {
      const fresh = { ...metadata, content: undefined } as SavedItem;
      added.unshift(fresh);
      byUrl.set(item.url, fresh);
    }
  }

  await browser.storage.local.set({ ...contents, savedItems: [...added, ...items] });
};
