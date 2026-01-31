import browser from 'webextension-polyfill';
import { saveItem, getSavedItems, getItem, deleteItem, updateItem, generateId } from './storage';
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
    content: '<p>Some content</p>'
  };

  describe('getSavedItems', () => {
    it('should return empty array if storage is empty', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({});
      const items = await getSavedItems();
      expect(items).toEqual([]);
    });

    it('should return saved items from metadata list', async () => {
      // items in list might not have content
      const listItems = [{ ...mockItem, content: undefined }];
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: listItems });
      const items = await getSavedItems();
      expect(items).toEqual(listItems);
    });
  });

  describe('getItem', () => {
    it('should return null if item does not exist', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [] });
      const item = await getItem('1');
      expect(item).toBeNull();
    });

    it('should return item with content if it is a legacy item (content in metadata)', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });
      const item = await getItem('1');
      expect(item).toEqual(mockItem);
    });

    it('should fetch content from separate key if not in metadata', async () => {
      const metadataItem = { ...mockItem, content: undefined };

      // Mock get implementations
      (browser.storage.local.get as jest.Mock).mockImplementation((key) => {
        if (key === 'savedItems') return Promise.resolve({ savedItems: [metadataItem] });
        if (key === 'content_1') return Promise.resolve({ content_1: mockItem.content });
        return Promise.resolve({});
      });

      const item = await getItem('1');
      expect(item).toEqual(mockItem);
      expect(browser.storage.local.get).toHaveBeenCalledWith('content_1');
    });
  });

  describe('saveItem', () => {
    it('should add a new item to the list without content and save content separately', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [] });

      await saveItem(mockItem);

      const { content, ...metadata } = mockItem;
      const expectedMetadata = { ...metadata, content: undefined };

      // Verify content saved
      expect(browser.storage.local.set).toHaveBeenCalledWith({ [`content_${mockItem.id}`]: content });

      // Verify metadata list saved
      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [expectedMetadata] });
    });

    it('should update an existing item and migrate content if needed', async () => {
      const existingItem = { ...mockItem, title: 'Old Title', content: undefined };
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [existingItem] });

      const updatedItem = { ...mockItem, title: 'New Title' };
      await saveItem(updatedItem);

      const { content, ...metadata } = updatedItem;
      const expectedMetadata = { ...metadata, content: undefined };

      expect(browser.storage.local.set).toHaveBeenCalledWith({ [`content_${mockItem.id}`]: content });
      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [expectedMetadata] });
    });
  });

  describe('deleteItem', () => {
    it('should remove an item by id and delete its content', async () => {
      (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });

      await deleteItem('1');

      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [] });
      expect(browser.storage.local.remove).toHaveBeenCalledWith('content_1');
    });
  });

  describe('updateItem', () => {
    it('should update fields of an item and strip content from metadata', async () => {
      const metadataItem = { ...mockItem, content: undefined };
      (browser.storage.local.get as jest.Mock).mockImplementation((key) => {
        if (key === 'savedItems') return Promise.resolve({ savedItems: [metadataItem] });
        if (key === 'content_1') return Promise.resolve({ content_1: mockItem.content }); // for getItem at the end
        return Promise.resolve({});
      });

      await updateItem('1', { isFavorite: true });

      expect(browser.storage.local.set).toHaveBeenCalledWith({
        savedItems: [{ ...metadataItem, isFavorite: true }]
      });
    });

    it('should save content separately if content is updated', async () => {
      const metadataItem = { ...mockItem, content: undefined };
      (browser.storage.local.get as jest.Mock).mockImplementation((key) => {
        if (key === 'savedItems') return Promise.resolve({ savedItems: [metadataItem] });
        return Promise.resolve({});
      });

      await updateItem('1', { content: '<p>New Content</p>' });

      expect(browser.storage.local.set).toHaveBeenCalledWith({ 'content_1': '<p>New Content</p>' });

      // Verify it was not added to metadata
      // The mock calls will show savedItems set with content: undefined
      const expectedMetadata = { ...metadataItem };
      delete expectedMetadata.content;

      expect(browser.storage.local.set).toHaveBeenCalledWith({ savedItems: [expectedMetadata] });
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

      const id = generateId();
      expect(id).toHaveLength(9);
      expect(typeof id).toBe('string');

      jest.restoreAllMocks();
      Object.defineProperty(global, 'crypto', { value: originalCrypto, writable: true });
    });
  });
});
