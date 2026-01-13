import browser from 'webextension-polyfill';

browser.runtime.onMessage.addListener((message: any, sender: browser.Runtime.MessageSender) => {
  if (message.action === 'saveLink') {
    console.log('Saving link:', message.url, message.title);
    // Here you would typically save the link to storage
    // For now, let's just store it in localStorage as a simple example
    browser.storage.local.get('savedLinks').then((data) => {
      const savedLinks: any[] = (data.savedLinks as any[] || []);
      savedLinks.push({ url: message.url, title: message.title, savedAt: new Date().toISOString() });
      browser.storage.local.set({ savedLinks }).then(() => {
        console.log('Link saved to storage.');
      });
    });
  }
});

browser.contextMenus.create({
  id: "save-to-pocket-like",
  title: "Save to Pocket-like",
  contexts: ["page", "link"],
});

browser.contextMenus.onClicked.addListener((info: browser.Menus.OnClickData, tab?: browser.Tabs.Tab) => {
  if (info.menuItemId === "save-to-pocket-like") {
    if (info.linkUrl) {
      // If it's a link, save the link URL
      browser.runtime.sendMessage({
        action: 'saveLink',
        url: info.linkUrl,
        title: info.selectionText || info.linkUrl,
      });
    } else if (tab && tab.url) {
      // If it's a page, save the page URL
      browser.runtime.sendMessage({
        action: 'saveLink',
        url: tab.url,
        title: tab.title || tab.url,
      });
    }
  }
});
