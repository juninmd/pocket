import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus, ItemType } from './types';
import { generateId } from './storage';

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
const analyzeAllItems = async (items: SavedItem[], apiKey: string): Promise<SavedItem[]> => {
    const simplifyForAI = items.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        domain: new URL(item.url).hostname
    }));

    const prompt = `Você é um especialista em organização de conhecimento. Analise estes favoritos e crie uma estrutura de pastas lógica e hierárquica.

REGRAS:
1. Crie categorias intuitivas baseadas no conteúdo (ex: "Tecnologia/Programação/JavaScript", "Entretenimento/Jogos", "Trabalho/Ferramentas")
2. Use "/" para hierarquia de pastas
3. Agrupe itens similares na mesma pasta
4. Máximo 3 níveis de profundidade
5. Use nomes de pastas em português
6. Cada item deve ter exatamente 1 pasta e 3 tags relevantes

Retorne APENAS um JSON array válido, sem markdown, onde cada objeto tem:
- id: (exatamente como no input)
- aiFolder: (string com caminho da pasta, ex: "Tecnologia/Web Dev")
- aiTags: (array de 3 strings descritivas)

Input (${items.length} itens):
${JSON.stringify(simplifyForAI, null, 0)}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const data = await response.json();

        debugger;
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            console.error("No AI response received");
            return items;
        }

        // Extract JSON from response (handle markdown code blocks)
        let jsonString = aiText;
        const codeBlockMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
        } else {
            const jsonMatch = aiText.match(/\[[\s\S]*\]/);
            if (jsonMatch) jsonString = jsonMatch[0];
        }

        const suggestions = JSON.parse(jsonString);

        return items.map(item => {
            const suggestion = suggestions.find((s: any) => s.id === item.id);
            if (suggestion) {
                return {
                    ...item,
                    aiFolder: suggestion.aiFolder || 'Outros',
                    aiTags: suggestion.aiTags || []
                };
            }
            return { ...item, aiFolder: 'Outros', aiTags: [] };
        });

    } catch (e) {
        console.error("AI Analysis Failed", e);
        return items;
    }
};

/**
 * Process items in batches for large collections
 */
export const organizeWithAI = async (items: SavedItem[], apiKey: string): Promise<SavedItem[]> => {
    if (items.length <= BATCH_SIZE) {
        return analyzeAllItems(items, apiKey);
    }

    // For large collections, process in batches
    const batches: SavedItem[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
    }

    let processedItems: SavedItem[] = [];
    for (const batch of batches) {
        try {
            const enrichedBatch = await analyzeAllItems(batch, apiKey);
            processedItems = [...processedItems, ...enrichedBatch];
        } catch (e) {
            console.error("Error analyzing batch", e);
            processedItems = [...processedItems, ...batch];
        }
    }

    return processedItems;
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
        const organizedItems = await organizeWithAI(items, apiKey);

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
