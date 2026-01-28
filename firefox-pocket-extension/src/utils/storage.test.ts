import browser from 'webextension-polyfill';
import { saveItem, getSavedItems, deleteItem, updateItem, generateId } from './storage';
import { SavedItem, ItemStatus, ItemType } from './types';

describe('storage utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockItem: SavedItem = {
    id: '1',
    url: 'https://example.com',
    title: 'Test Example',
    status: ItemStatus.Unread,
    isFavorite: false,
    type: ItemType.Article,
    tags: [],
    savedAt: '2023-01-01T00:00:00.000Z',
  };

  describe('getSavedItems', () => {
    it('should return empty array if storage is empty', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({});
      const items = await getSavedItems();
      expect(items).toEqual([]);
    });

    it('should return saved items', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });
      const items = await getSavedItems();
      expect(items).toEqual([mockItem]);
    });
  });

  describe('saveItem', () => {
    it('should add a new item to the list', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [] });
      await saveItem(mockItem);
      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [mockItem] });
    });

    it('should update an existing item if url matches', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });
      const updatedItem = { ...mockItem, title: 'New Title' };
      await saveItem(updatedItem);
      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [updatedItem] });
    });
  });

  describe('deleteItem', () => {
    it('should remove an item by id', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });
      await deleteItem('1');
      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [] });
    });
  });

  describe('updateItem', () => {
    it('should update fields of an item', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });
      await updateItem('1', { isFavorite: true });
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        savedItems: [{ ...mockItem, isFavorite: true }]
      });
    });

    it('should return null if item not found', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [] });
        const result = await updateItem('999', { isFavorite: true });
        expect(result).toBeNull();
    });
  });

  describe('generateId', () => {
    it('should use crypto.randomUUID if available', () => {
      const mockUUID = '1234-5678';
      const originalCrypto = global.crypto;

      // Mock crypto.randomUUID
      Object.defineProperty(global, 'crypto', {
        value: {
          randomUUID: jest.fn().mockReturnValue(mockUUID)
        },
        writable: true
      });

      expect(generateId()).toBe(mockUUID);

      // Restore
      Object.defineProperty(global, 'crypto', { value: originalCrypto, writable: true });
    });

    it('should fallback to Math.random if crypto.randomUUID is undefined', () => {
      const originalCrypto = global.crypto;

      // Mock crypto to be undefined or missing randomUUID
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true
      });

      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
      // 0.123456789.toString(36) -> "0.4fzzzxj..."
      // substr(2, 9) -> "4fzzzxj..."

      const id = generateId();
      expect(id).toHaveLength(9);
      expect(typeof id).toBe('string');

      jest.restoreAllMocks();
      Object.defineProperty(global, 'crypto', { value: originalCrypto, writable: true });
    });
  });
});
