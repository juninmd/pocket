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

    describe('resizeImage', () => {
        it('should resize image', async () => {
            const result = await resizeImage('data:image/jpeg;base64,original');
            expect(result).toBe('data:image/jpeg;base64,resized');
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

        it('getLinks should return items', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'getLinks' }, {} as any);
            expect(result.items).toEqual([mockItem]);
        });

        it('getLink should return item', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'getLink', payload: { url: 'http://test.com' } }, {} as any);
            expect(result.success).toBe(true);
            expect(result.item).toEqual(mockItem);
        });

         it('updateLink should update item', async () => {
            (storage.updateItem as jest.Mock).mockResolvedValue(mockItem);
            const result = await handleMessage({ action: 'updateLink', payload: { id: '1', updates: {} } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('deleteLink should delete item', async () => {
            (storage.deleteItem as jest.Mock).mockResolvedValue(undefined);
            const result = await handleMessage({ action: 'deleteLink', payload: { id: '1' } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('importBookmarks should import', async () => {
            (aiOrganizer.importBookmarks as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'importBookmarks' }, {} as any);
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
        });

        it('organizeWithAI should organize', async () => {
            (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (aiOrganizer.organizeWithAI as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'organizeWithAI', payload: { apiKey: 'key' } }, {} as any);
            expect(result.success).toBe(true);
        });

        it('previewOrganization should return items', async () => {
             (storage.getSavedItems as jest.Mock).mockResolvedValue([mockItem]);
            (aiOrganizer.organizeWithAI as jest.Mock).mockResolvedValue([mockItem]);
            const result = await handleMessage({ action: 'previewOrganization', payload: { apiKey: 'key' } }, {} as any);
            expect(result.items).toEqual([mockItem]);
        });

        it('applyOrganization should save items', async () => {
            const items = [mockItem];
            const result = await handleMessage({ action: 'applyOrganization', payload: { items } }, {} as any);
            expect(result.success).toBe(true);
            expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: items });
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
    });

    describe('handleContextMenu', () => {
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

            (browser.tabs.sendMessage as jest.Mock).mockResolvedValue({ title: 'Meta Title' });
            (browser.tabs.captureVisibleTab as jest.Mock).mockResolvedValue('data:image/jpeg;base64,original');
             (storage.saveItem as jest.Mock).mockResolvedValue(undefined);

             await handleContextMenu(info, tab);
             await new Promise(r => setTimeout(r, 50));

             expect(browser.tabs.sendMessage).toHaveBeenCalled();
             expect(storage.saveItem).toHaveBeenCalledWith(expect.objectContaining({ title: 'Meta Title' }));
        });
    });
});
