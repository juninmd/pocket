import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState } from '@juninmd/sonido';
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

const Tile = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <Card
        interactive
        surface="glass"
        className="card tile"
        padding="none"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
    >
        {children}
    </Card>
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
        if (tagged.length === 0) {
            return (
                <EmptyState
                    titleAs="h2"
                    title={`Nenhum item com a tag #${selectedTag}`}
                    action={<Button variant="ghost" onClick={() => setSelectedTag(null)}>Voltar para Coleções</Button>}
                />
            );
        }
        return (
            <div>
                <div className="folder-nav">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTag(null)}>← Voltar</Button>
                    <h2>#{selectedTag}</h2>
                </div>
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
                            <Tile key={n.fullPath} onClick={() => { setSelectedFolder(n.fullPath); onClearSearch(); }}>
                                <span className="tile-icon" aria-hidden="true">📁</span>
                                <h3>{n.name}</h3>
                                <p>{n.totalItemCount} itens</p>
                            </Tile>
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
                            <Tile key={tag} onClick={() => setSelectedTag(tag)}>
                                <h3>#{tag}</h3>
                                <Badge tone="neutral" appearance="count">{items.filter(i => hasTag(i, tag)).length}</Badge>
                            </Tile>
                        ))}
                    </div>
                </Section>
            )}

            {subfolders.length === 0 && direct.length === 0 && selectedFolder && (
                <EmptyState title="Esta pasta está vazia." />
            )}
        </div>
    );
};
