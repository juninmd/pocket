import React, { useState } from 'react';
import { Button, Card, EmptyState } from '@juninmd/sonido';
import { SavedItem, ItemStatus } from '../utils/types';

const hostOf = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
};

const pick = (items: SavedItem[]) => items[Math.floor(Math.random() * items.length)];

export const DiscoverView = ({ items }: { items: SavedItem[] }) => {
    const unread = items.filter(i => i.status === ItemStatus.Unread);
    const [seed, setSeed] = useState(0);
    // Pick once per "Próximo Item" click, not on every render.
    const current = React.useMemo(() => (unread.length ? pick(unread) : null), [unread.length, seed]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!current) {
        return <EmptyState titleAs="h2" title="Sem itens para redescobrir" description="Salve mais itens!" />;
    }

    return (
        <div className="discover">
            <Card surface="glass" className="card discover-card" padding="none">
                <a href={current.url} target="_blank" rel="noopener noreferrer" className="discover-link">
                    <div className="card-image discover-image" style={{ backgroundImage: `url(${current.imageUrl || 'icons/placeholder.svg'})` }} />
                    <div className="card-content">
                        <div className="eyebrow">REDESCOBRIR</div>
                        <div className="card-title discover-title">{current.title}</div>
                        <div className="card-meta">{current.siteName || hostOf(current.url)} • {current.estimatedReadTime || 5} min</div>
                        {current.excerpt && <p className="discover-excerpt">{current.excerpt}</p>}
                    </div>
                </a>
                <div className="card-content discover-footer">
                    <Button className="primary-btn wide" onClick={() => setSeed(s => s + 1)}>Próximo Item</Button>
                </div>
            </Card>
        </div>
    );
};
