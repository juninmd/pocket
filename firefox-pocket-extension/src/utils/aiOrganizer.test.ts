import browser from 'webextension-polyfill';
import { importBookmarks, organizeWithAI, organizeAndExportToFirefox, exportToFirefox } from './aiOrganizer';
import { callGeminiWithTools } from './aiService';
import { SavedItem, ItemStatus, ItemType } from './types';

jest.mock('./aiService', () => ({
    callGeminiWithTools: jest.fn()
}));
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
            expect(result.items[0].aiFolder).toBe('Tech/Web');
            expect(result.items[0].aiTags).toEqual(['web']);
        });

        it('should handle AI failures gracefully', async () => {
            const items = [mockItem];
            (callGeminiWithTools as jest.Mock).mockRejectedValue(new Error('AI Error'));

            const result = await organizeWithAI(items, 'key');
            // Actually it returns original item if failure
            expect(result.items[0]).toEqual(mockItem);
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

        it('should handle batch errors', async () => {
            const items = Array.from({ length: 20 }, (_, i) => ({ ...mockItem, id: `${i}` }));
            (callGeminiWithTools as jest.Mock).mockRejectedValue(new Error('Batch Fail'));

            const result = await organizeWithAI(items, 'key');
            expect(result.items).toHaveLength(20); // Should return original items
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
            expect(result.items[0]).toEqual(mockItem);
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
            expect(result.items[0]).toEqual(mockItem);
        });

        it('should handle missing item in suggestion', async () => {
            const items = [mockItem];
            const mockResponse = {
                functionCall: {
                    name: 'organize_items',
                    args: {
                        organizedItems: [] // Empty suggestions
                    }
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const result = await organizeWithAI(items, 'key');
            expect(result.items[0].aiFolder).toBe('Outros');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No suggestion found'));
            consoleSpy.mockRestore();
        });

        it('should handle AI not calling function', async () => {
            const items = [mockItem];
            const mockResponse = {
                text: 'Just text response'
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const result = await organizeWithAI(items, 'key');
            expect(result.items[0]).toEqual(mockItem); // Original returned
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("AI did not call 'organize_items'"),
                expect.anything()
            );
            consoleSpy.mockRestore();
        });

        it('should handle invalid URL in batch (triggering outer catch)', async () => {
            // Create 20 items. Item 16 has invalid URL.
            const items = Array.from({ length: 20 }, (_, i) => ({
                ...mockItem,
                id: `${i}`,
                url: i === 16 ? 'invalid-url' : 'https://valid.com'
            }));

            // Mock Gemini for valid calls
             const mockResponse = {
                functionCall: {
                    name: 'organize_items',
                    args: { organizedItems: [] }
                }
            };
            (callGeminiWithTools as jest.Mock).mockResolvedValue(mockResponse);

            const result = await organizeWithAI(items, 'key');

            expect(result.items).toHaveLength(20);
            // Debug logs should contain error for batch 2
            const errorLog = result.debugLogs.find((l: any) => l.error);
            expect(errorLog).toBeDefined();
            expect(errorLog.batchSize).toBeDefined();
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
            (callGeminiWithTools as jest.Mock).mockResolvedValue({}); // AI succeeds (or swallows)
            (browser.bookmarks.create as jest.Mock).mockRejectedValue(new Error('Fail'));

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

        it('should reuse existing folders', async () => {
            const items = [
                { ...mockItem, id: '1', aiFolder: 'Tech' },
                { ...mockItem, id: '2', aiFolder: 'Tech' }
            ];

            (browser.bookmarks.create as jest.Mock)
                .mockResolvedValueOnce({ id: 'root' }) // Root
                .mockResolvedValueOnce({ id: 'tech_id' }) // Tech folder (1st time)
                .mockResolvedValueOnce({ id: 'bm1' }) // Item 1
                .mockResolvedValueOnce({ id: 'bm2' }); // Item 2

            const count = await exportToFirefox(items);
            expect(count).toBe(2);
            // Should verify create calls.
            // 1 root + 1 folder + 2 items = 4 calls.
            expect(browser.bookmarks.create).toHaveBeenCalledTimes(4);
        });

        it('should export nested folders', async () => {
            const items = [{ ...mockItem, aiFolder: 'Tech/Web/React' }];

            (browser.bookmarks.create as jest.Mock)
                .mockResolvedValueOnce({ id: 'root' })
                .mockResolvedValueOnce({ id: 'tech' })
                .mockResolvedValueOnce({ id: 'web' })
                .mockResolvedValueOnce({ id: 'react' })
                .mockResolvedValueOnce({ id: 'bm' });

            const count = await exportToFirefox(items);
            expect(count).toBe(1);
            expect(browser.bookmarks.create).toHaveBeenCalledTimes(5); // Root + 3 folders + 1 item
        });

        it('should handle empty list', async () => {
            // Only root folder is created
            (browser.bookmarks.create as jest.Mock).mockResolvedValue({ id: 'root' });
            const count = await exportToFirefox([]);
            expect(count).toBe(0);
        });

        it('should use originalFolder fallback', async () => {
            const items = [{ ...mockItem, aiFolder: undefined, originalFolder: 'Original' }];
            (browser.bookmarks.create as jest.Mock)
                .mockResolvedValueOnce({ id: 'root' })
                .mockResolvedValueOnce({ id: 'orig' })
                .mockResolvedValueOnce({ id: 'bm' });

            const count = await exportToFirefox(items);
            expect(count).toBe(1);
        });

        it('should reuse parent folders for nested structures (Hit Cache)', async () => {
            const items = [
                { ...mockItem, id: '1', aiFolder: 'Tech/Web' },
                { ...mockItem, id: '2', aiFolder: 'Tech/Mobile' }
            ];

            const rootId = 'root';
            const techId = 'tech_id';
            const webId = 'web_id';
            const mobileId = 'mobile_id';

            (browser.bookmarks.create as jest.Mock)
                .mockResolvedValueOnce({ id: rootId }) // Root
                // Item 1: Tech/Web
                .mockResolvedValueOnce({ id: techId }) // Create Tech
                .mockResolvedValueOnce({ id: webId })  // Create Web
                .mockResolvedValueOnce({ id: 'bm1' })  // Bookmark 1
                // Item 2: Tech/Mobile
                // 'Tech' should be cached, no create call
                .mockResolvedValueOnce({ id: mobileId }) // Create Mobile (inside Tech)
                .mockResolvedValueOnce({ id: 'bm2' });   // Bookmark 2

            const count = await exportToFirefox(items);
            expect(count).toBe(2);
            expect(browser.bookmarks.create).toHaveBeenCalledTimes(6);
        });
    });
});
