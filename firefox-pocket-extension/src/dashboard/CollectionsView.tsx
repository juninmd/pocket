import React, { useMemo, useState } from 'react';
import { SavedItem } from '../utils/types';
import { buildFolderTree, FolderNode } from '../utils/folderStructure';
import { ItemGrid, ItemActions } from './ItemGrid';
import { FolderNav } from './FolderNav';

interface CollectionsViewProps {
    items: SavedItem[];
    searchQuery: string;
    matches: SavedItem[];
    actions: ItemActions;
    onClearSearch: () => void;
}

const hasTag = (item: SavedItem, tag: string) => !!(item.tags?.includes(tag) || item.aiTags?.includes(tag));

const findNode = (tree: Record<string, FolderNode>, path: string): FolderNode | null => {
    let node: FolderNode | null = null;
    let level = tree;
    for (const part of path.split('/')) {
        if (!level[part]) return null;
        node = level[part];
        level = node.children;
    }
    return node;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
        <h3 className="section-title">{title}</h3>
        {children}
    </section>
);

export const CollectionsView = ({ items, searchQuery, matches, actions, onClearSearch }: CollectionsViewProps) => {
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const tree = useMemo(() => buildFolderTree(items), [items]);
    const tags = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => { i.tags?.forEach(t => set.add(t)); i.aiTags?.forEach(t => set.add(t)); });
        return Array.from(set).sort();
    }, [items]);

    if (selectedTag) {
        const tagged = items.filter(i => hasTag(i, selectedTag));
        const back = <button className="btn ghost" onClick={() => setSelectedTag(null)}>← Voltar</button>;
        if (tagged.length === 0) {
            return (
                <div className="empty-state">
                    <h2>Nenhum item com a tag #{selectedTag}</h2>
                    <button className="btn ghost" onClick={() => setSelectedTag(null)}>Voltar para Coleções</button>
                </div>
            );
        }
        return (
            <div>
                <div className="folder-nav">{back}<h2>#{selectedTag}</h2></div>
                <ItemGrid items={tagged} actions={actions} />
            </div>
        );
    }

    if (searchQuery) return <ItemGrid items={matches} actions={actions} />;

    const node = selectedFolder ? findNode(tree, selectedFolder) : null;
    const subfolders = node ? Object.values(node.children) : Object.values(tree);
    const direct = selectedFolder ? items.filter(i => { const folder = i.aiFolder || i.originalFolder || 'Outros'; return folder.split('/').pop() === selectedFolder.split('/').pop(); }) : [];
    const leaf = selectedFolder?.split('/').pop() ?? '...';

    return (
        <div className="stack">
            <FolderNav selectedFolder={selectedFolder} onSelect={(p) => { setSelectedFolder(p); if (p) onClearSearch(); }} />

            {subfolders.length > 0 && (
                <Section title={selectedFolder ? 'Subpastas' : 'Minhas Coleções'}>
                    <div className="grid tiles">
                        {subfolders.map(n => (
                            <button type="button" key={n.fullPath} className="card tile" onClick={() => { setSelectedFolder(n.fullPath); onClearSearch(); }}>
                                <span className="tile-icon" aria-hidden="true">📁</span>
                                <h3>{n.name}</h3>
                                <p>{n.totalItemCount} itens</p>
                            </button>
                        ))}
                    </div>
                </Section>
            )}

            {direct.length > 0 && (
                <Section title={`Itens em "${leaf}"`}>
                    <ItemGrid items={direct} actions={actions} />
                </Section>
            )}

            {!selectedFolder && (
                <Section title="Explorar por Tags">
                    <div className="grid tiles small">
                        {tags.map(tag => (
                            <button type="button" key={tag} className="card tile" onClick={() => setSelectedTag(tag)}>
                                <h3>#{tag}</h3>
                                <p>{items.filter(i => hasTag(i, tag)).length}</p>
                            </button>
                        ))}
                    </div>
                </Section>
            )}

            {subfolders.length === 0 && direct.length === 0 && selectedFolder && (
                <div className="empty-state"><p>Esta pasta está vazia.</p></div>
            )}
        </div>
    );
};
