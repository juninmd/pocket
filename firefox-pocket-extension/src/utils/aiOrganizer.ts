import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType } from './types';
import { generateId } from './storage';
import { callGeminiWithTools, Tool } from './aiService';

// Maximum items to batch for AI analysis
const BATCH_SIZE = 15;

export interface OrganizedBatch {
    items: SavedItem[];
}

export interface OrganizationResult {
    success: boolean;
    itemsOrganized: number;
    foldersCreated: number;
    error?: string;
}

const organizeItemsTool: Tool = {
    function_declarations: [{
        name: "organize_items",
        description: "Organizes a list of items into a hierarchical folder structure and assigns tags. Use '/' to separate folder levels (e.g. 'Tech/Web/React').",
        parameters: {
            type: "OBJECT",
            properties: {
                organizedItems: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            id: { type: "STRING" },
                            folderPath: { type: "STRING", description: "The logical folder path (e.g. 'Technology/Dev'). Max depth 3." },
                            tags: { type: "ARRAY", items: { type: "STRING" } }
                        },
                        required: ["id", "folderPath", "tags"]
                    }
                }
            },
            required: ["organizedItems"]
        }
    }]
};

export const importBookmarks = async (): Promise<SavedItem[]> => {
    const bookmarks = await browser.bookmarks.getTree();
    const savedItems: SavedItem[] = [];

    const traverse = (nodes: browser.Bookmarks.BookmarkTreeNode[], folderPath: string) => {
        for (const node of nodes) {
            if (node.url) {
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
                const newPath = folderPath ? `${folderPath} > ${node.title}` : node.title;
                traverse(node.children, newPath);
            }
        }
    };

    traverse(bookmarks, '');
    return savedItems;
};

/**
 * Analyze all items at once to get a cohesive folder structure
 */
const analyzeAllItems = async (items: SavedItem[], apiKey: string, model: string = 'gemini-1.5-flash'): Promise<{ items: SavedItem[], debugLog: any }> => {
    const simplifyForAI = items.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        domain: new URL(item.url).hostname
    }));

    const prompt = `Você é um especialista em organização de conhecimento. Analise estes favoritos e chame a função para organizá-los em pastas lógicas.

REGRAS:
1. Crie categorias intuitivas baseadas no conteúdo (ex: "Tecnologia/Programação/JavaScript", "Entretenimento/Jogos", "Trabalho/Ferramentas")
2. Use "/" para criar subcoleções (ex: "Tecnologia/Programação/React" cria uma pasta React dentro de Programação, dentro de Tecnologia)
3. Agrupe itens similares na mesma pasta
4. Máximo 3 níveis de profundidade
5. Use nomes de pastas em português
6. Cada item deve ter exatamente 1 pasta e 3 tags relevantes

Input (${items.length} itens):
${JSON.stringify(simplifyForAI, null, 0)}`;

    console.log("[AI Organizer] Prompting Gemini with:", items.length, "items");

    let debugInfo: any = {
        promptInfo: { itemCount: items.length },
        rawResponse: null,
        error: null
    };

    try {
        const response = await callGeminiWithTools(apiKey, prompt, model as any, {
            tools: [organizeItemsTool],
            toolConfig: { function_calling_config: { mode: 'ANY' } }
        });

        debugInfo.rawResponse = response;

        console.log("[AI Organizer] Raw Response:", response);

        if (response.functionCall && response.functionCall.name === 'organize_items') {
            const suggestions = response.functionCall.args.organizedItems;
            console.log("[AI Organizer] Suggestions received:", suggestions?.length);

            if (!suggestions || !Array.isArray(suggestions)) {
                console.error("[AI Organizer] Invalid function call arguments:", response.functionCall.args);
                return { items, debugLog: debugInfo };
            }

            const organized = items.map(item => {
                const suggestion = suggestions.find((s: any) => s.id === item.id);
                if (suggestion) {
                    console.log(`[AI Organizer] Matched item ${item.id} to folder: ${suggestion.folderPath}`);
                    return {
                        ...item,
                        aiFolder: suggestion.folderPath || 'Outros',
                        aiTags: suggestion.tags || []
                    };
                }
                console.warn(`[AI Organizer] No suggestion found for item ${item.id} (${item.title})`);
                return { ...item, aiFolder: 'Outros', aiTags: [] };
            });
            return { items: organized, debugLog: debugInfo };
        }

        console.warn("[AI Organizer] AI did not call 'organize_items'. Response:", response);
        return { items, debugLog: debugInfo };

    } catch (e) {
        console.error("[AI Organizer] AI Analysis Failed Critical:", e);
        debugInfo.error = String(e);
        return { items, debugLog: debugInfo };
    }
};

/**
 * Process items in batches for large collections
 */
export const organizeWithAI = async (items: SavedItem[], apiKey: string, model: string = 'gemini-1.5-flash'): Promise<{ items: SavedItem[], debugLogs: any[] }> => {
    if (items.length <= BATCH_SIZE) {
        const result = await analyzeAllItems(items, apiKey, model);
        return { items: result.items, debugLogs: [result.debugLog] };
    }

    // For large collections, process in batches
    const batches: SavedItem[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
    }

    let processedItems: SavedItem[] = [];
    const allDebugLogs: any[] = [];

    for (const batch of batches) {
        try {
            const { items: enrichedBatch, debugLog } = await analyzeAllItems(batch, apiKey, model);
            processedItems = [...processedItems, ...enrichedBatch];
            allDebugLogs.push(debugLog);
        } catch (e) {
            console.error("Error analyzing batch", e);
            processedItems = [...processedItems, ...batch];
            allDebugLogs.push({ error: String(e), batchSize: batch.length });
        }
    }

    return { items: processedItems, debugLogs: allDebugLogs };
};

/**
 * Complete flow: Analyze with AI and export to Firefox bookmarks
 */
export const organizeAndExportToFirefox = async (
    items: SavedItem[],
    apiKey: string
): Promise<OrganizationResult> => {
    try {
        // Step 1: Analyze items with AI
        console.log(`[AI Organizer] Analyzing ${items.length} items...`);
        const { items: organizedItems } = await organizeWithAI(items, apiKey);

        // Step 2: Export to Firefox
        console.log(`[AI Organizer] Creating Firefox bookmark structure...`);
        const result = await exportToFirefoxWithStats(organizedItems);

        // Step 3: Save organized items back to storage
        await browser.storage.local.set({ savedItems: organizedItems });

        return {
            success: true,
            itemsOrganized: result.itemCount,
            foldersCreated: result.folderCount
        };
    } catch (error) {
        console.error("[AI Organizer] Failed:", error);
        return {
            success: false,
            itemsOrganized: 0,
            foldersCreated: 0,
            error: String(error)
        };
    }
};

/**
 * Export to Firefox with statistics
 */
const exportToFirefoxWithStats = async (
    items: SavedItem[]
): Promise<{ itemCount: number; folderCount: number }> => {
    // Create root folder with timestamp
    const timestamp = new Date().toLocaleDateString('pt-BR');
    const rootFolder = await browser.bookmarks.create({
        title: `📚 Organizado por IA (${timestamp})`,
        parentId: "toolbar_____"
    });

    // Group items by folder
    const folderMap = new Map<string, SavedItem[]>();
    for (const item of items) {
        const folder = item.aiFolder || item.originalFolder || "Outros";
        if (!folderMap.has(folder)) {
            folderMap.set(folder, []);
        }
        folderMap.get(folder)!.push(item);
    }

    // Create folder structure
    const folderIdCache = new Map<string, string>();
    let itemCount = 0;
    let folderCount = 0;

    for (const [folderPath, folderItems] of folderMap) {
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
                folderCount++;
            }
        }

        // Create bookmarks
        for (const item of folderItems) {
            await browser.bookmarks.create({
                title: item.title,
                url: item.url,
                parentId: parentId
            });
            itemCount++;
        }
    }

    return { itemCount, folderCount };
};

// Legacy export function for backwards compatibility
export const exportToFirefox = async (items: SavedItem[]): Promise<number> => {
    const result = await exportToFirefoxWithStats(items);
    return result.itemCount;
};
