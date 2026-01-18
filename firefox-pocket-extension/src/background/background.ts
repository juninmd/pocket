import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType, Message } from '../utils/types';
import { getSavedItems, saveItem, updateItem, deleteItem, generateId } from '../utils/storage';

browser.runtime.onMessage.addListener(async (msg: any, sender: browser.Runtime.MessageSender) => {
  const message = msg as Message;
  switch (message.action) {
    case 'saveLink': {
      console.log('Saving link:', message.payload.url);
      const { url, title, imageUrl, description, siteName, author, estimatedReadTime } = message.payload;
      const newItem: SavedItem = {
        id: generateId(),
        url: url,
        title: title || url,
        excerpt: description,
        imageUrl: imageUrl,
        siteName: siteName,
        author: author,
        status: ItemStatus.Unread,
        isFavorite: false,
        type: ItemType.Article, // Default to article for now
        tags: [],
        savedAt: new Date().toISOString(),
        estimatedReadTime: estimatedReadTime || 5
      };
      await saveItem(newItem);
      console.log('Link saved.');
      // Broadcast update
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => {});
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
      // Broadcast update
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => {});
      return { success: !!updatedItem, item: updatedItem };
    }
    case 'deleteLink': {
      const { id, url } = message.payload;
      if (id) {
        await deleteItem(id);
      } else if (url) {
        // Delete by URL
        const items = await getSavedItems();
        const item = items.find(i => i.url === url);
        if (item) {
          await deleteItem(item.id);
        }
      }
      // Broadcast update
      browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => {});
      return { success: true };
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
                url: url!, // We know url is present
                title: title || metadata.title || url!,
                excerpt: metadata.description,
                imageUrl: metadata.imageUrl,
                siteName: metadata.siteName,
                author: metadata.author,
                status: ItemStatus.Unread,
                isFavorite: false,
                type: ItemType.Article,
                tags: [],
                savedAt: new Date().toISOString(),
                estimatedReadTime: metadata.estimatedReadTime || 5
              };
              saveItem(newItem).then(() => {
                console.log('Saved via context menu');
                browser.runtime.sendMessage({ action: 'itemsUpdated' }).catch(() => {});
              });
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
