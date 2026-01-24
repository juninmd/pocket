
export interface FolderNode {
    name: string;
    fullPath: string;
    children: Record<string, FolderNode>;
    itemCount: number; // Items directly in this folder
    totalItemCount: number; // Items in this folder AND subfolders
}

/**
 * Builds a folder tree from a list of items with aiFolder properties.
 * Expects aiFolder to be a slash-separated string (e.g., "Tech/JS").
 */
export const buildFolderTree = (items: { aiFolder?: string; originalFolder?: string }[]): Record<string, FolderNode> => {
    const root: Record<string, FolderNode> = {};

    items.forEach(item => {
        const folderPath = item.aiFolder || item.originalFolder || 'Outros';
        const parts = folderPath.split('/').filter(p => p.trim());

        let currentLevel = root;
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    name: part,
                    fullPath: currentPath,
                    children: {},
                    itemCount: 0,
                    totalItemCount: 0
                };
            }

            // Increment total count for this node (includes subfolder items)
            currentLevel[part].totalItemCount++;

            // If it's the last part, this is the direct folder for the item
            if (index === parts.length - 1) {
                currentLevel[part].itemCount++;
            }

            // Move deeper
            currentLevel = currentLevel[part].children;
        });
    });

    return root;
};
