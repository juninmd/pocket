import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType, Message } from '../utils/types';
import { getSavedItems, saveItem, updateItem, deleteItem, generateId } from '../utils/storage';
import { organizeWithAI, importBookmarks, exportToFirefox, organizeAndExportToFirefox } from '../utils/aiOrganizer';

const captureSnapshot = async (windowId?: number): Promise<string | undefined> => {
  try {
    const dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 50 });
    return await resizeImage(dataUrl);
  } catch (e) {
    console.error('Failed to capture snapshot', e);
    return undefined;
  }
};

const resizeImage = (dataUrl: string): Promise<string> => {
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

browser.runtime.onMessage.addListener(async (msg: any, sender: browser.Runtime.MessageSender) => {
  const message = msg as Message;
  switch (message.action) {
    case 'saveLink': {
      console.log('Saving link:', message.payload.url);
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
      console.log('Link saved.');
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
      const item = items.find(i => i.url === url);
      return { success: !!item, item };
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
      for (const item of bookmarks) {
        await saveItem(item);
      }
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true, count: bookmarks.length };
    }
    case 'organizeWithAI': { // Legacy/Direct action
      const { apiKey } = message.payload;
      const items = await getSavedItems();
      const organizedItems = await organizeWithAI(items, apiKey);
      await browser.storage.local.set({ savedItems: organizedItems });
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
      return { success: true };
    }
    case 'previewOrganization': {
      const { apiKey } = message.payload;
      const items = await getSavedItems();
      const organizedItems = await organizeWithAI(items, apiKey);
      return { success: true, items: organizedItems };
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
});

browser.contextMenus.create({
  id: "save-to-pocket-like",
  title: "Salvar no Pocket-like",
  contexts: ["page", "link"],
});

browser.contextMenus.onClicked.addListener((info: browser.Menus.OnClickData, tab?: browser.Tabs.Tab) => {
  if (info.menuItemId === "save-to-pocket-like") {
    let url = info.linkUrl;
    let title = info.selectionText || info.linkUrl;

    if (!url && tab && tab.url) {
      url = tab.url;
      title = tab.title || tab.url;
    }

    if (url) {
      const performSave = (metadata: any = {}) => {
        const newItem: SavedItem = {
          id: generateId(),
          url: url!,
          title: title || metadata.title || url!,
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
          captureSnapshot(tab.windowId).then(snapshot => {
            if (snapshot) newItem.snapshotUrl = snapshot;
            saveItem(newItem).then(() => {
              console.log('Saved via context menu');
              browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
            });
          });
        } else {
          saveItem(newItem).then(() => {
            console.log('Saved via context menu');
            browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => { });
          });
        }
      };

      if (tab && tab.id) {
        browser.tabs.sendMessage(tab.id, { action: 'getMetadata' })
          .then(metadata => performSave(metadata))
          .catch(() => performSave());
      } else {
        performSave();
      }
    }
  }
});
