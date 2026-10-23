import React from 'react';
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
        <div className="card clickable" onClick={handleCardClick}>
            <div className="card-body">
                <div className="card-image" style={{ backgroundImage: `url(${item.snapshotUrl || item.imageUrl || 'icons/placeholder.svg'})` }}></div>
                <div className="card-content">
                    <a
                        className="card-title"
                        href={hasContent ? readerUrl : item.url}
                        onClick={(e) => e.preventDefault()}
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
                    {/* Tags handling */}
                    {((item.tags && item.tags.length > 0) || (item.aiTags && item.aiTags.length > 0)) && (
                        <div className="card-tags">
                            {item.tags && item.tags.map(tag => (
                                <span key={tag} className="card-tag">{tag}</span>
                            ))}
                            {item.aiTags && item.aiTags.map(tag => (
                                <span key={`ai-${tag}`} className="card-tag ai">✨ {tag}</span>
                            ))}
                        </div>
                    )}
                    <div className="card-actions" onClick={stopProp}>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            title="Abrir original"
                            aria-label="Abrir original"
                            onClick={stopProp}
                        >
                            🔗
                        </a>
                        <button
                            type="button"
                            className={`icon-btn ${item.isFavorite ? 'is-favorite' : ''}`}
                            title={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                            aria-label={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                            aria-pressed={item.isFavorite}
                            onClick={(e) => onToggleFavorite(e, item.id, item.isFavorite)}
                        >
                            ★
                        </button>
                        <button
                            type="button"
                            className={`icon-btn ${item.status === ItemStatus.Archived ? 'is-archived' : ''}`}
                            title={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                            aria-label={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                            aria-pressed={item.status === ItemStatus.Archived}
                            onClick={(e) => onToggleArchive(e, item.id, item.status)}
                        >
                            📥
                        </button>
                        {onEdit && (
                            <button
                                type="button"
                                className="icon-btn"
                                title="Editar tags e pasta"
                                aria-label="Editar tags e pasta"
                                onClick={(e) => onEdit(e, item)}
                            >
                                ✏️
                            </button>
                        )}
                        <button
                            type="button"
                            className="icon-btn"
                            title="Excluir"
                            aria-label="Excluir"
                            onClick={(e) => onDelete(e, item.id)}
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
