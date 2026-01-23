import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType } from './types';
import { generateId } from './storage';

// Maximum items to batch for AI analysis
const BATCH_SIZE = 10;

export interface OrganizedBatch {
    items: SavedItem[];
}

export const importBookmarks = async (): Promise<SavedItem[]> => {
    const bookmarks = await browser.bookmarks.getTree();
    const savedItems: SavedItem[] = [];

    const traverse = (nodes: browser.Bookmarks.BookmarkTreeNode[], folderPath: string) => {
        for (const node of nodes) {
            if (node.url) {
                // It's a bookmark
                savedItems.push({
                    id: generateId(),
                    url: node.url,
                    title: node.title || node.url,
                    status: ItemStatus.Unread,
                    isFavorite: false,
                    type: ItemType.Article,
                    tags: [],
                    savedAt: new Date().toISOString(),
                    originalFolder: folderPath
                });
            } else if (node.children) {
                // It's a folder
                const newPath = folderPath ? `${folderPath} > ${node.title}` : node.title;
                traverse(node.children, newPath);
            }
        }
    };

    traverse(bookmarks, '');
    return savedItems;
};

export const organizeWithAI = async (items: SavedItem[], apiKey: string): Promise<SavedItem[]> => {
    const initializedItems = [...items];
    const batches = [];

    for (let i = 0; i < initializedItems.length; i += BATCH_SIZE) {
        batches.push(initializedItems.slice(i, i + BATCH_SIZE));
    }

    let processedItems: SavedItem[] = [];

    for (const batch of batches) {
        try {
            const enrichedBatch = await analyzeBatch(batch, apiKey);
            processedItems = [...processedItems, ...enrichedBatch];
        } catch (e) {
            console.error("Error analyzing batch", e);
            // Fallback: return original items without AI data
            processedItems = [...processedItems, ...batch];
        }
    }

    return processedItems;
};

const analyzeBatch = async (items: SavedItem[], apiKey: string): Promise<SavedItem[]> => {
    const simplifyForAI = items.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        originalFolder: item.originalFolder
    }));

    const prompt = `
    You are a knowledge manager. Organize these bookmarks into a logical folder structure and assign 3 relevant tags to each.
    Return ONLY a JSON array where each object has:
    - id: (matching the input id)
    - aiFolder: (string, a logical category name, e.g., "Technology/Web", "Cooking", "Reference")
    - aiTags: (array of 3 strings)

    Input:
    ${JSON.stringify(simplifyForAI)}
  `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) return items;

        // Extract JSON from response (handle potential code blocks)
        const jsonMatch = aiText.match(/\[.*\]/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiText;
        const suggestions = JSON.parse(jsonString);

        // Merge suggestions
        return items.map(item => {
            const suggestion = suggestions.find((s: any) => s.id === item.id);
            if (suggestion) {
                return {
                    ...item,
                    aiFolder: suggestion.aiFolder,
                    aiTags: suggestion.aiTags || []
                };
            }
            return item;
        });

    } catch (e) {
        console.error("AI Analysis Failed", e);
        return items;
    }
};

// Export items to Firefox Bookmarks
export const exportToFirefox = async (items: SavedItem[]): Promise<number> => {
    // Create a root folder for our exports
    const rootFolder = await browser.bookmarks.create({
        title: "Pocket-like Export",
        parentId: "toolbar_____" // Firefox toolbar
    });

    // Group items by folder
    const folderMap = new Map<string, SavedItem[]>();
    for (const item of items) {
        const folder = item.aiFolder || item.originalFolder || "Uncategorized";
        if (!folderMap.has(folder)) {
            folderMap.set(folder, []);
        }
        folderMap.get(folder)!.push(item);
    }

    // Create folders and bookmarks
    const folderIdCache = new Map<string, string>();
    let count = 0;

    for (const [folderPath, folderItems] of folderMap) {
        // Create nested folder structure
        const parts = folderPath.split('/').filter(p => p.trim());
        let parentId = rootFolder.id;

        for (const part of parts) {
            const cacheKey = `${parentId}/${part}`;
            if (folderIdCache.has(cacheKey)) {
                parentId = folderIdCache.get(cacheKey)!;
            } else {
                const newFolder = await browser.bookmarks.create({
                    title: part.trim(),
                    parentId: parentId
                });
                folderIdCache.set(cacheKey, newFolder.id!);
                parentId = newFolder.id!;
            }
        }

        // Create bookmarks in this folder
        for (const item of folderItems) {
            await browser.bookmarks.create({
                title: item.title,
                url: item.url,
                parentId: parentId
            });
            count++;
        }
    }

    return count;
};
