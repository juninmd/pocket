import browser from 'webextension-polyfill';
import { importBookmarks, organizeWithAI, organizeAndExportToFirefox, exportToFirefox } from './aiOrganizer';
import { callGeminiWithTools } from './aiService';
import { SavedItem, ItemStatus, ItemType } from './types';

jest.mock('./aiService');
jest.mock('webextension-polyfill', () => ({
    bookmarks: {
        getTree: jest.fn(),
        create: jest.fn(),
    },
    storage: {
        local: {
            set: jest.fn(),
        }
    },
    runtime: {
        sendMessage: jest.fn()
    }
}));

describe('aiOrganizer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockItem: SavedItem = {
        id: '1',
        url: 'https://example.com',
        title: 'Example',
        status: ItemStatus.Unread,
        isFavorite: false,
        type: ItemType.Article,
        tags: [],
        savedAt: '2023-01-01',
    };

    describe('importBookmarks', () => {
        it('should import bookmarks recursively', async () => {
            const mockTree = [
                {
                    title: 'Folder',
                    children: [
                        { title: 'Item 1', url: 'https://1.com' },
                        {
                            title: 'SubFolder',
                            children: [
                                { title: 'Item 2', url: 'https://2.com' }
                            ]
                        }
                    ]
                }
            ];
            (browser.bookmarks.getTree as jest.Mock).mockResolvedValue(mockTree);

            const result = await importBookmarks();
            expect(result).toHaveLength(2);
            expect(result[0].url).toBe('https://1.com');
            expect(result[0].originalFolder).toBe('Folder');
            expect(result[1].url).toBe('https://2.com');
            expect(result[1].originalFolder).toBe('Folder > SubFolder');
        });
    });

    describe('organizeWithAI', () => {
        it('should organize items using AI service', async () => {
            const items = [mockItem];
            const apiKey = 'key';
            const mockResponse = {
                functionCall: {
                    name: 'organize_items',
                    args: {
                        organizedItems: [{
                            id: '1',
                            folderPath: 'Tech/Web',
                            tags: ['web']
                        }]
                    }
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);

            const result = await organizeWithAI(items, apiKey);
            expect(result[0].aiFolder).toBe('Tech/Web');
            expect(result[0].aiTags).toEqual(['web']);
        });

        it('should handle AI failures gracefully', async () => {
            const items = [mockItem];
            (callGeminiWithTools as jest.Mock).mockRejectedValue(new Error('AI Error'));

            const result = await organizeWithAI(items, 'key');
            expect(result[0].aiFolder).toBeUndefined(); // Or however it falls back
            // Actually it returns original item if failure
            expect(result[0]).toEqual(mockItem);
        });

        it('should handle batching', async () => {
            // Create 20 items (BATCH_SIZE is 15)
            const items = Array.from({ length: 20 }, (_, i) => ({ ...mockItem, id: `${i}` }));
             const mockResponse = {
                functionCall: {
                    name: 'organize_items',
                    args: {
                        organizedItems: [] // empty for simplicity
                    }
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);

            await organizeWithAI(items, 'key');
            expect(callGeminiWithTools).toHaveBeenCalledTimes(2);
        });

        it('should handle wrong function call name', async () => {
             const items = [mockItem];
             const mockResponse = {
                functionCall: {
                    name: 'wrong_func',
                    args: {}
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);

            const result = await organizeWithAI(items, 'key');
            expect(result[0]).toEqual(mockItem);
        });

        it('should handle invalid args', async () => {
             const items = [mockItem];
             const mockResponse = {
                functionCall: {
                    name: 'organize_items',
                    args: { organizedItems: null }
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);

            const result = await organizeWithAI(items, 'key');
            expect(result[0]).toEqual(mockItem);
        });
    });

    describe('organizeAndExportToFirefox', () => {
        it('should organize and then export', async () => {
             const items = [mockItem];
             // Mock organizeWithAI internal call by mocking callGeminiWithTools
             const mockResponse = {
                functionCall: {
                    name: 'organize_items',
                    args: {
                        organizedItems: [{
                            id: '1',
                            folderPath: 'Tech',
                            tags: ['web']
                        }]
                    }
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);

            // Mock browser.bookmarks.create
            const rootFolder = { id: 'root_id' };
            const subFolder = { id: 'folder_id' };
            (browser.bookmarks.create as jest.Mock)
                .mockResolvedValueOnce(rootFolder) // Root
                .mockResolvedValueOnce(subFolder) // Tech
                .mockResolvedValueOnce({ id: 'bm_id' }); // Bookmark

            const result = await organizeAndExportToFirefox(items, 'key');

            expect(result.success).toBe(true);
            expect(result.itemsOrganized).toBe(1);
            expect(result.foldersCreated).toBe(1);
            expect(browser.storage.local.set).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
             (callGeminiWithTools as jest.Mock).mockRejectedValue(new Error('Fail'));

             const result = await organizeAndExportToFirefox([mockItem], 'key');
             expect(result.success).toBe(false);
             expect(result.error).toBe('Error: Fail');
        });
    });

    describe('exportToFirefox', () => {
        it('should export items using existing structure', async () => {
            const items = [{ ...mockItem, aiFolder: 'Folder1' }];

             (browser.bookmarks.create as jest.Mock)
                .mockResolvedValueOnce({ id: 'root' })
                .mockResolvedValueOnce({ id: 'f1' })
                .mockResolvedValueOnce({ id: 'b1' });

            const count = await exportToFirefox(items);
            expect(count).toBe(1);
        });
    });
});
