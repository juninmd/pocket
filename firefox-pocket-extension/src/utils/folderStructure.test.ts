import { buildFolderTree } from './folderStructure';

describe('buildFolderTree', () => {
    it('should build a hierarchical tree from flat items', () => {
        const items = [
            { aiFolder: 'Technology/Programming/JavaScript' },
            { aiFolder: 'Technology/Programming/TypeScript' },
            { aiFolder: 'Technology/Hardware' },
            { aiFolder: 'Cooking/Recipes' }
        ] as any[];

        const tree = buildFolderTree(items);

        // Check Top Level
        expect(tree['Technology']).toBeDefined();
        expect(tree['Cooking']).toBeDefined();

        // Check Second Level
        expect(tree['Technology'].children['Programming']).toBeDefined();
        expect(tree['Technology'].children['Hardware']).toBeDefined();

        // Check Third Level
        expect(tree['Technology'].children['Programming'].children['JavaScript']).toBeDefined();
        expect(tree['Technology'].children['Programming'].children['TypeScript']).toBeDefined();
    });

    it('should calculate item counts correctly', () => {
        const items = [
            { aiFolder: 'Tech/A' }, // 1 in A
            { aiFolder: 'Tech/A' }, // 2 in A
            { aiFolder: 'Tech/B' }, // 1 in B
            { aiFolder: 'Tech' }    // 1 in Tech
        ] as any[];

        const tree = buildFolderTree(items);

        // Tech should have 1 direct item, but 4 total in tree?
        // Let's check logic:
        // 'Tech/A' -> Tech (total++) -> A (total++, item++)
        // 'Tech' -> Tech (total++, item++)

        expect(tree['Tech'].itemCount).toBe(1);
        expect(tree['Tech'].totalItemCount).toBe(4);

        expect(tree['Tech'].children['A'].itemCount).toBe(2);
        expect(tree['Tech'].children['A'].totalItemCount).toBe(2);
    });

    it('should fallback to originalFolder if aiFolder is missing', () => {
        const items = [
            { originalFolder: 'Bookmarks/Toolbar' }
        ] as any[];

        const tree = buildFolderTree(items);
        expect(tree['Bookmarks']).toBeDefined();
        expect(tree['Bookmarks'].children['Toolbar']).toBeDefined();
    });

    it('should fallback to "Outros" if no folder specified', () => {
        const items = [
            { }
        ] as any[];

        const tree = buildFolderTree(items);
        expect(tree['Outros']).toBeDefined();
    });
});
