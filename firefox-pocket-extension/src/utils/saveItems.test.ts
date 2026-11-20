import browser from 'webextension-polyfill';
import { saveItem } from './storage';
import { saveItems } from './saveItems';
import { ItemStatus, ItemType, SavedItem } from './types';

const item = (id: string, url: string, extra: Partial<SavedItem> = {}): SavedItem => ({
  id,
  url,
  title: id,
  status: ItemStatus.Unread,
  isFavorite: false,
  type: ItemType.Article,
  tags: [],
  savedAt: '2026-11-20T00:00:00.000Z',
  ...extra,
});

/** In-memory storage.local so saveItem and saveItems can be compared on real state. */
const useMemoryStorage = (initial: Record<string, unknown>) => {
  const store: Record<string, unknown> = JSON.parse(JSON.stringify(initial));
  (browser.storage.local.get as jest.Mock).mockImplementation(async (key: string) =>
    key in store ? { [key]: JSON.parse(JSON.stringify(store[key])) } : {});
  (browser.storage.local.set as jest.Mock).mockImplementation(async (data: Record<string, unknown>) => {
    Object.assign(store, JSON.parse(JSON.stringify(data)));
  });
  return store;
};

describe('saveItems', () => {
  beforeEach(() => jest.clearAllMocks());

  const initial = { savedItems: [item('old', 'https://a.com', { isFavorite: true })] };
  const batch = [
    item('n1', 'https://b.com', { content: '<p>b</p>' }),
    item('n2', 'https://a.com', { title: 'A again', content: '<p>a</p>' }),
    item('n3', 'https://c.com'),
    item('n4', 'https://b.com', { title: 'B twice' }),
  ];

  it('ends in the same state as calling saveItem for each item', async () => {
    const sequential = useMemoryStorage(initial);
    for (const i of batch) await saveItem(i);
    const bulk = useMemoryStorage(initial);
    await saveItems(batch);
    expect(bulk).toEqual(sequential);
  });

  it('reads and writes storage once per batch', async () => {
    useMemoryStorage(initial);
    await saveItems(batch);
    expect(browser.storage.local.get).toHaveBeenCalledTimes(1);
    expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an empty batch', async () => {
    useMemoryStorage(initial);
    await saveItems([]);
    expect(browser.storage.local.set).not.toHaveBeenCalled();
  });
});
