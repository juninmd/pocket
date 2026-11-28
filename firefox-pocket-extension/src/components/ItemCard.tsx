import React from 'react';
import { Badge, Button, Card } from '@juninmd/sonido';
import { SavedItem, ItemStatus } from '../utils/types';

interface ItemCardProps {
    item: SavedItem;
    onToggleFavorite: (e: React.MouseEvent, id: string, isFavorite: boolean) => void;
    onToggleArchive: (e: React.MouseEvent, id: string, currentStatus: ItemStatus) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onEdit?: (e: React.MouseEvent, item: SavedItem) => void;
}

const hostOf = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
};

export const ItemCard = React.memo(({ item, onToggleFavorite, onToggleArchive, onDelete, onEdit }: ItemCardProps) => {
    const readerUrl = `reader.html?id=${item.id}`;
    const hasContent = !!item.content;

    const handleCardClick = () => {
        if (hasContent) {
            window.location.href = readerUrl;
        } else {
            window.open(item.url, '_blank');
        }
    };

    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <Card surface="glass" interactive className="card clickable" onClick={handleCardClick} padding="none">
            <div className="card-body">
                <div className="card-image" style={{ backgroundImage: `url(${item.snapshotUrl || item.imageUrl || 'icons/placeholder.svg'})` }}></div>
                <div className="card-content">
                    <a
                        className="card-title"
                        href={hasContent ? readerUrl : item.url}
                        onClick={(e) => {
                            // Modified clicks keep the native "open in new tab/window" behavior.
                            if (e.ctrlKey || e.metaKey || e.shiftKey) e.stopPropagation();
                            else e.preventDefault();
                        }}
                    >
                        {item.title}
                    </a>
                    <div className="card-meta">
                        <img
                            className="card-favicon"
                            src={item.favicon || `https://www.google.com/s2/favicons?domain=${hostOf(item.url)}&sz=16`}
                            alt=""
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span>{item.siteName || hostOf(item.url)}</span>
                        <span>• {item.estimatedReadTime || 5} min</span>
                        {item.content && <span className="card-offline" role="img" aria-label="Versão backup disponível" title="Versão backup disponível">📖</span>}
                    </div>
                    {item.excerpt && (
                        <div className="card-excerpt">
                            {item.excerpt}
                        </div>
                    )}
                    {((item.tags && item.tags.length > 0) || (item.aiTags && item.aiTags.length > 0)) && (
                        <div className="card-tags">
                            {item.tags && item.tags.map(tag => (
                                <Badge key={tag} tone="neutral" appearance="soft" className="card-tag">{tag}</Badge>
                            ))}
                            {item.aiTags && item.aiTags.map(tag => (
                                <Badge key={`ai-${tag}`} tone="accent" appearance="soft" className="card-tag ai">✨ {tag}</Badge>
                            ))}
                        </div>
                    )}
                    <div className="card-actions" onClick={stopProp}>
                        <Button
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="ghost"
                            size="icon"
                            className="icon-btn"
                            title="Abrir original"
                            aria-label="Abrir original"
                            onClick={stopProp}
                        >
                            🔗
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`icon-btn ${item.isFavorite ? 'is-favorite' : ''}`}
                            title={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                            aria-label={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                            aria-pressed={item.isFavorite}
                            onClick={(e) => onToggleFavorite(e, item.id, item.isFavorite)}
                        >
                            ★
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`icon-btn ${item.status === ItemStatus.Archived ? 'is-archived' : ''}`}
                            title={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                            aria-label={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                            aria-pressed={item.status === ItemStatus.Archived}
                            onClick={(e) => onToggleArchive(e, item.id, item.status)}
                        >
                            📥
                        </Button>
                        {onEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="icon-btn"
                                title="Editar tags e pasta"
                                aria-label="Editar tags e pasta"
                                onClick={(e) => onEdit(e, item)}
                            >
                                ✏️
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="icon-btn"
                            title="Excluir"
                            aria-label="Excluir"
                            onClick={(e) => onDelete(e, item.id)}
                        >
                            🗑️
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
});
