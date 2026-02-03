import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType, Message } from '../utils/types';
import { getSavedItems, saveItem, updateItem, deleteItem, generateId, getItem } from '../utils/storage';
import { organizeWithAI, importBookmarks, exportToFirefox, organizeAndExportToFirefox } from '../utils/aiOrganizer';

/**
 * Resizes an image data URL to a maximum width of 320px.
 * Used for creating thumbnails of saved pages.
 *
 * @param {string} dataUrl - The original image data URL.
 * @returns {Promise<string>} A promise that resolves to the resized image data URL.
 */
export const resizeImage = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 320;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/**
 * Captures a visible tab snapshot and resizes it.
 *
 * @param {number} [windowId] - The ID of the window to capture.
 * @returns {Promise<string | undefined>} The resized snapshot data URL or undefined if failed.
 */
export const captureSnapshot = async (windowId?: number): Promise<string | undefined> => {
  try {
    const dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 50 });
    return await resizeImage(dataUrl);
  } catch (e) {
    console.error('Failed to capture snapshot', e);
    return undefined;
  }
};

/**
 * Handles incoming messages from other parts of the extension.
 * Supports actions like saveLink, getLinks, updateLink, etc.
 *
 * @param {any} msg - The message object.
 * @param {browser.Runtime.MessageSender} sender - The sender of the message.
 * @returns {Promise<any>} A promise resolving to the response.
 */
export const handleMessage = async (msg: any, sender: browser.Runtime.MessageSender) => {
  const message = msg as Message;
  switch (message.action) {
    case 'saveLink': {
      const { url, title, imageUrl, description, siteName, author, estimatedReadTime, content, favicon } = message.payload;
      const newItem: SavedItem = {
        id: generateId(),
        url: url,
        title: title || url,
        excerpt: description,
        imageUrl: imageUrl,
        siteName: siteName,
        author: author,
        content: content,
        favicon: favicon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
        status: ItemStatus.Unread,
        isFavorite: false,
        type: ItemType.Article,
        tags: [],
        savedAt: new Date().toISOString(),
        estimatedReadTime: estimatedReadTime || 5
      };

      if (!imageUrl) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url === url) {
          newItem.snapshotUrl = await captureSnapshot(tabs[0].windowId);
        }
      }

      await saveItem(newItem);
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true, item: newItem };
    }
    case 'getLinks': {
      const items = await getSavedItems();
      return { items };
    }
    case 'getLink': {
      const { url } = message.payload;
      const items = await getSavedItems();
      const found = items.find(i => i.url === url);

      if (found) {
          const fullItem = await getItem(found.id);
          return { success: !!fullItem, item: fullItem };
      }
      return { success: false, item: null };
    }
    case 'updateLink': {
      const { id, updates } = message.payload;
      const updatedItem = await updateItem(id, updates);
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: !!updatedItem, item: updatedItem };
    }
    case 'deleteLink': {
      const { id, url } = message.payload;
      if (id) {
        await deleteItem(id);
      } else if (url) {
        const items = await getSavedItems();
        const item = items.find(i => i.url === url);
        if (item) {
          await deleteItem(item.id);
        }
      }
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true };
    }
    case 'importBookmarks': {
      const bookmarks = await importBookmarks();
      const BATCH_SIZE = 100;
      let processed = 0;
      const total = bookmarks.length;

      // Process in batches
      for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
        const batch = bookmarks.slice(i, i + BATCH_SIZE);

        // Save batch
        for (const item of batch) {
          await saveItem(item);
        }

        processed += batch.length;

        // Broadcast progress
        browser.runtime.sendMessage({
          action: 'importProgress',
          payload: { current: processed, total }
        }).catch(() => { });
      }

      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true, count: bookmarks.length };
    }
    case 'organizeWithAI': { // Legacy/Direct action
      const { apiKey, model } = message.payload;
      const items = await getSavedItems();
      const { items: organizedItems } = await organizeWithAI(items, apiKey, model);
      await browser.storage.local.set({ savedItems: organizedItems });
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true };
    }
    case 'previewOrganization': {
      const { apiKey, model } = message.payload;
      const items = await getSavedItems();
      const { items: organizedItems, debugLogs } = await organizeWithAI(items, apiKey, model);
      return { success: true, items: organizedItems, debugLogs };
    }
    case 'applyOrganization': {
      const { items } = message.payload;
      await saveItem(items[0]); // Hack to trigger storage? No, we need bulk save.
      // Re-using storage.local.set for bulk update safely
      await browser.storage.local.set({ savedItems: items });
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true };
    }
    case 'exportToFirefox': {
      const items = await getSavedItems();
      const count = await exportToFirefox(items);
      return { success: true, count };
    }
    case 'organizeAndExportAI': {
      const { apiKey } = message.payload;
      const items = await getSavedItems();
      const result = await organizeAndExportToFirefox(items, apiKey);
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return result;
    }
  }
};

/**
 * Context menu handler for saving pages/links.
 *
 * @param {browser.Menus.OnClickData} info - Information about the context menu click.
 * @param {browser.Tabs.Tab} [tab] - The tab where the click occurred.
 */
export const handleContextMenu = async (info: browser.Menus.OnClickData, tab?: browser.Tabs.Tab) => {
  if (info.menuItemId === "save-to-pocket-like") {
    let url = info.linkUrl;
    let title = info.selectionText || info.linkUrl;

    if (!url && tab && tab.url) {
      url = tab.url;
      title = tab.title || tab.url;
    }

    if (url) {
      const performSave = async (metadata: any = {}) => {
        const newItem: SavedItem = {
          id: generateId(),
          url: url!,
          title: (title && title !== url) ? title : (metadata.title || title || url!),
          excerpt: metadata.description,
          imageUrl: metadata.imageUrl,
          siteName: metadata.siteName,
          author: metadata.author,
          content: metadata.content,
          status: ItemStatus.Unread,
          isFavorite: false,
          type: ItemType.Article,
          tags: [],
          savedAt: new Date().toISOString(),
          estimatedReadTime: metadata.estimatedReadTime || 5,
          snapshotUrl: undefined
        };

        if (tab && tab.active) {
          const snapshot = await captureSnapshot(tab.windowId);
          if (snapshot) newItem.snapshotUrl = snapshot;
        }

        await saveItem(newItem);
        browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      };

      if (tab && tab.id && (!info.linkUrl || info.linkUrl === tab.url)) {
        try {
          const metadata = await browser.tabs.sendMessage(tab.id, { action: 'getMetadata' });
          await performSave(metadata);
        } catch (e) {
          await performSave();
        }
      } else {
        await performSave();
      }
    }
  }
};

browser.runtime.onMessage.addListener(handleMessage);

browser.contextMenus.create({
  id: "save-to-pocket-like",
  title: "Salvar no Pocket-like",
  contexts: ["page", "link"],
});

browser.contextMenus.onClicked.addListener(handleContextMenu);
