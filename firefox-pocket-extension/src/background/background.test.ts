import browser from 'webextension-polyfill';
import { handleMessage, handleContextMenu, captureSnapshot, resizeImage } from './background';
import { SavedItem, ItemStatus, ItemType } from '../utils/types';
import * as storage from '../utils/storage';
import * as aiOrganizer from '../utils/aiOrganizer';

jest.mock('../utils/storage');
jest.mock('../utils/aiOrganizer', () => ({
    importBookmarks: jest.fn(),
    organizeWithAI: jest.fn(),
    exportToFirefox: jest.fn(),
    organizeAndExportToFirefox: jest.fn(),
}));

jest.mock('webextension-polyfill', () => ({
    bookmarks: {
        getTree: jest.fn(),
        create: jest.fn(),
    },
    storage: {
        local: {
            set: jest.fn(),
            get: jest.fn(),
        }
    },
    runtime: {
        sendMessage: jest.fn().mockResolvedValue(undefined),
        onMessage: {
            addListener: jest.fn(),
        }
    },
    tabs: {
        query: jest.fn(),
        captureVisibleTab: jest.fn(),
        sendMessage: jest.fn(),
    },
    contextMenus: {
        create: jest.fn(),
        onClicked: {
            addListener: jest.fn(),
        }
    }
}));

// Mock HTMLImageElement and Canvas for resizeImage
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 1000;
  height = 1000;

  constructor() {
    setTimeout(() => this.onload && this.onload(), 10);
  }
}

// @ts-ignore
global.Image = MockImage;

describe('background script', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (storage.generateId as jest.Mock).mockReturnValue('123');
        // Mock canvas
        const mockContext = {
            drawImage: jest.fn(),
        };
        const mockCanvas = {
            getContext: jest.fn().mockReturnValue(mockContext),
            toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,resized'),
            width: 0,
            height: 0
        };
        jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
    });

    it('should register listeners on load', () => {
        jest.isolateModules(() => {
            const bg = require('./background');
            expect(browser.contextMenus.onClicked.addListener).toHaveBeenCalledWith(bg.handleContextMenu);
            expect(browser.runtime.onMessage.addListener).toHaveBeenCalledWith(bg.handleMessage);
        });
    });

    describe('resizeImage', () => {
        it('should resize image', async () => {
            const result = await resizeImage('data:image/jpeg;base64,original');
            expect(result).toBe('data:image/jpeg;base64,resized');
        });

        it('should return original if loading fails', async () => {
            // Mock Image to fail onload
            const originalImage = global.Image;
            // @ts-ignore
            global.Image = class FailImage {
                onload: any = null;
                onerror: any = null;
                src = '';
                constructor() {
                    setTimeout(() => this.onerror && this.onerror(), 10);
                }
            } as any;

            const result = await resizeImage('data:image/jpeg;base64,original');
            expect(result).toBe('data:image/jpeg;base64,original');

            global.Image = originalImage;
        });

        it('should handle missing canvas context', async () => {
            const mockCanvas = {
                getContext: jest.fn().mockReturnValue(null),
                toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,empty'),
                width: 0,
                height: 0
            };
            jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

            const result = await resizeImage('data:image/jpeg;base64,original');
            // If ctx is null, it proceeds to resolve with canvas.toDataURL
            expect(result).toBe('data:image/jpeg;base64,empty');
        });
    });

    describe('captureSnapshot', () => {
        it('should capture and resize', async () => {
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');
            const result = await captureSnapshot(1);
            expect(result).toBe('data:image/jpeg;base64,resized');
        });

        it('should handle errors', async () => {
            (browser.tabs.captureVisibleTab as jest.Mock).mockRejectedValue(new Error('Fail'));
            const result = await captureSnapshot(1);
            expect(result).toBeUndefined();
        });
    });

    describe('handleMessage', () => {
        const mockItem = { id: '1', url: 'http://test.com' };

        it('saveLink should save item', async () => {
            const payload = { url: 'http://test.com', title: 'Test' };
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);
            (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://test.com', windowId: 1 }]);
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');

            const result = await handleMessage({ action: 'saveLink', payload }, {} as any);
            expect(result.success).toBe(true);
            expect(storage.saveItem).toHaveBeenCalled();
            expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ action: 'itemsUpdated' });
        });

        it('saveLink should fallback to url for title', async () => {
            const payload = { url: 'http://test.com' }; // No title
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);
            (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://test.com', windowId: 1 }]);
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');

            await handleMessage({ action: 'saveLink', payload }, {} as any);
            expect(storage.saveItem).toHaveBeenCalledWith(expect.objectContaining({ title: 'http://test.com' }));
        });

        it('should handle sendMessage error', async () => {
            const payload = { url: 'http://test.com', title: 'Test' };
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Send Fail'));

            // Should not throw
            await handleMessage({ action: 'saveLink', payload }, {} as any);
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('getLinks should return items', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'getLinks' }, {} as any);
            expect(result.items).toEqual([mockItem]);
        });

        it('getLink should return item', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (storage.getItem as jest.Mock).mockResolvedValue(mockItem);
            const result = await handleMessage({ action: 'getLink', payload: { url: 'http://test.com' } }, {} as any);
            expect(result.success).toBe(true);
            expect(result.item).toEqual(mockItem);
        });

        it('getLink should return null item if not found', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([]);
            const result = await handleMessage({ action: 'getLink', payload: { url: 'http://test.com' } }, {} as any);
            expect(result.success).toBe(false);
            expect(result.item).toBeNull();
        });

         it('updateLink should update item', async () => {
            (storage.updateItem as jest.Mock).mockResolvedValue(mockItem);
            const result = await handleMessage({ action: 'updateLink', payload: { id: '1', updates: {} } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('updateLink should handle sendMessage error', async () => {
            (storage.updateItem as jest.Mock).mockResolvedValue(mockItem);
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));
            const result = await handleMessage({ action: 'updateLink', payload: { id: '1', updates: {} } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('deleteLink should delete item', async () => {
            (storage.deleteItem as jest.Mock).mockResolvedValue(undefined);
            const result = await handleMessage({ action: 'deleteLink', payload: { id: '1' } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('deleteLink should delete item by url', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (storage.deleteItem as jest.Mock).mockResolvedValue(undefined);
            const result = await handleMessage({ action: 'deleteLink', payload: { url: 'http://test.com' } }, {} as any);
            expect(result.success).toBe(true);
            expect(storage.deleteItem).toHaveBeenCalledWith('1');
        });

        it('deleteLink should handle sendMessage error', async () => {
            (storage.deleteItem as jest.Mock).mockResolvedValue(undefined);
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));
            const result = await handleMessage({ action: 'deleteLink', payload: { id: '1' } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('importBookmarks should import', async () => {
            (aiOrganizer.importBookmarks as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'importBookmarks' }, {} as any);
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });

        it('importBookmarks should handle sendMessage error', async () => {
            (aiOrganizer.importBookmarks as jest.Mock).mockResolvedValue([mockItem]);
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));
            const result = await handleMessage({ action: 'importBookmarks' }, {} as any);
            expect(result.success).toBe(true);
        });

        it('organizeWithAI should organize', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (aiOrganizer.organizeWithAI as jest.Mock).mockResolvedValue({ items: [mockItem] });
            const result = await handleMessage({ action: 'organizeWithAI', payload: { apiKey: 'key' } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('organizeWithAI should handle sendMessage error', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (aiOrganizer.organizeWithAI as jest.Mock).mockResolvedValue({ items: [mockItem] });
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));
            const result = await handleMessage({ action: 'organizeWithAI', payload: { apiKey: 'key' } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('previewOrganization should return items', async () => {
             (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (aiOrganizer.organizeWithAI as jest.Mock).mockResolvedValue({ items: [mockItem], debugLogs: [] });
            const result = await handleMessage({ action: 'previewOrganization', payload: { apiKey: 'key' } }, {} as any);
            expect(result.items).toEqual([mockItem]);
        });

        it('applyOrganization should save items', async () => {
            const items = [mockItem];
            const result = await handleMessage({ action: 'applyOrganization', payload: { items } }, {} as any);
            expect(result.success).toBe(true);
            expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: items });
        });

        it('applyOrganization should handle sendMessage error', async () => {
            const items = [mockItem];
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));
            const result = await handleMessage({ action: 'applyOrganization', payload: { items } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('exportToFirefox should export', async () => {
            (aiOrganizer.exportToFirefox as jest.Mock).mockResolvedValue(5);
            const result = await handleMessage({ action: 'exportToFirefox' }, {} as any);
             expect(result.count).toBe(5);
        });

        it('organizeAndExportAI should work', async () => {
             (aiOrganizer.organizeAndExportToFirefox as jest.Mock).mockResolvedValue({ success: true });
             const result = await handleMessage({ action: 'organizeAndExportAI', payload: { apiKey: 'key' } }, {} as any);
             expect(result.success).toBe(true);
        });

        it('organizeAndExportAI should handle sendMessage error', async () => {
             (aiOrganizer.organizeAndExportToFirefox as jest.Mock).mockResolvedValue({ success: true });
             (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));
             const result = await handleMessage({ action: 'organizeAndExportAI', payload: { apiKey: 'key' } }, {} as any);
             expect(result.success).toBe(true);
        });
    });

    describe('handleContextMenu', () => {
        it('should handle sendMessage error in performSave', async () => {
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: 'http://test.com' } as any;
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);
            (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Fail'));

            await handleContextMenu(info);
            await new Promise(r => setTimeout(r, 10));

            expect(storage.saveItem).toHaveBeenCalled();
        });

        it('should save link from context menu', async () => {
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: 'http://test.com' } as any;
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

            await handleContextMenu(info);
            // Since it's async inside but void return, we wait a bit
            await new Promise(r => setTimeout(r, 10));

            expect(storage.saveItem).toHaveBeenCalled();
        });

         it('should save page if no linkUrl', async () => {
            const info = { menuItemId: 'save-to-pocket-like' } as any;
            const tab = { url: 'http://page.com', title: 'Page' } as any;
             (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

            await handleContextMenu(info, tab);
             await new Promise(r => setTimeout(r, 10));

             expect(storage.saveItem).toHaveBeenCalled();
        });

        it('should get metadata from tab if possible', async () => {
            const info = { menuItemId: 'save-to-pocket-like' } as any;
            const tab = { id: 1, active: true, windowId: 123, url: 'http://test.com' } as any;

            (browser.tabs.sendMessage as jest.Mock).mockResolvedValue({ title: 'Meta Title', siteName: 'Meta Site' });
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');
             (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

             await handleContextMenu(info, tab);
             await new Promise(r => setTimeout(r, 50));

             expect(browser.tabs.sendMessage).toHaveBeenCalled();
             // title might be overwritten by linkUrl, so check siteName
             expect(storage.saveItem).toHaveBeenCalledWith(expect.objectContaining({ siteName: 'Meta Site' }));
        });

        it('should get metadata when linkUrl is same as tab url', async () => {
            const url = 'http://test.com';
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: url } as any;
            const tab = { id: 1, active: true, windowId: 123, url: url } as any;

            (browser.tabs.sendMessage as jest.Mock).mockResolvedValue({ title: 'Meta Title', siteName: 'Meta Site' });
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

            await handleContextMenu(info, tab);
            await new Promise(r => setTimeout(r, 50));

            expect(browser.tabs.sendMessage).toHaveBeenCalled();
            expect(storage.saveItem).toHaveBeenCalledWith(expect.objectContaining({ siteName: 'Meta Site' }));
        });

        it('should use url as title if tab title equals url and no metadata title', async () => {
            const url = 'http://test.com';
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: url } as any;
            const tab = { id: 1, active: true, windowId: 1, url, title: url } as any; // Title == URL

            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');
            // Mock getMetadata failure
            (browser.tabs.sendMessage as jest.Mock).mockRejectedValue(new Error('No meta'));

            await handleContextMenu(info, tab);
            await new Promise(r => setTimeout(r, 50));

            expect(storage.saveItem).toHaveBeenCalledWith(expect.objectContaining({
                title: url
            }));
        });

        it('should use metadata title if tab title equals url', async () => {
            const url = 'http://test.com';
            const metaTitle = 'Real Title';
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: url } as any;
            const tab = { id: 1, active: true, windowId: 1, url, title: url } as any; // Title == URL

            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');
            (browser.tabs.sendMessage as jest.Mock).mockResolvedValue({ title: metaTitle });

            await handleContextMenu(info, tab);
            await new Promise(r => setTimeout(r, 50));

            expect(storage.saveItem).toHaveBeenCalledWith(expect.objectContaining({
                title: metaTitle
            }));
        });

        it('should handle metadata fetch failure', async () => {
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: 'http://test.com' } as any;
            const tab = { id: 1 } as any;

            (browser.tabs.sendMessage as jest.Mock).mockRejectedValue(new Error('Meta Fail'));
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

            await handleContextMenu(info, tab);
            await new Promise(r => setTimeout(r, 50));

            expect(storage.saveItem).toHaveBeenCalled(); // Should still save
        });

        it('should trigger catch block when metadata fetch fails', async () => {
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: 'http://test.com' } as any;
            const tab = { id: 1, url: 'http://test.com' } as any;

            (browser.tabs.sendMessage as jest.Mock).mockRejectedValue(new Error('Meta Fail'));
            (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

            await handleContextMenu(info, tab);
            await new Promise(r => setTimeout(r, 50));

            expect(storage.saveItem).toHaveBeenCalled();
        });

        it('should retry save without metadata if save with metadata fails', async () => {
            const url = 'http://test.com';
            const info = { menuItemId: 'save-to-pocket-like', linkUrl: url } as any;
            const tab = { id: 1, active: true, windowId: 123, url: url, title: 'Tab Title' } as any;

            (browser.tabs.sendMessage as jest.Mock).mockResolvedValue({ title: 'Meta Title' });
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');

            // First call (with metadata) fails, second call (no metadata) succeeds
            (storage.saveItem as jest.Mock)
                .mockRejectedValueOnce(new Error('Save Fail'))
                .mockResolvedValueOnce(undefined);

            await handleContextMenu(info, tab);
            await new Promise(r => setTimeout(r, 50));

            expect(storage.saveItem).toHaveBeenCalledTimes(2);
        });

        it('should ignore unrelated context menu items', async () => {
            const info = { menuItemId: 'other-item', linkUrl: 'http://test.com' } as any;
            await handleContextMenu(info);
            expect(storage.saveItem).not.toHaveBeenCalled();
        });
    });
});
