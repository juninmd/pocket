import React from 'react';
import { SavedItem, ItemStatus } from '../utils/types';

interface ItemCardProps {
    item: SavedItem;
    onToggleFavorite: (e: React.MouseEvent, id: string, isFavorite: boolean) => void;
    onToggleArchive: (e: React.MouseEvent, id: string, currentStatus: ItemStatus) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onEdit?: (e: React.MouseEvent, item: SavedItem) => void;
}

export const ItemCard = React.memo(({ item, onToggleFavorite, onToggleArchive, onDelete, onEdit }: ItemCardProps) => {
    const readerUrl = `reader.html?id=${item.id}`;
    const hasContent = !!item.content;

    const handleCardClick = (e: React.MouseEvent) => {
        if (hasContent) {
            window.location.href = readerUrl;
        } else {
            window.open(item.url, '_blank');
        }
    };

    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }} onClick={handleCardClick}>
            <div style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="card-image" style={{ backgroundImage: `url(${item.snapshotUrl || item.imageUrl || 'icons/placeholder.svg'})` }}></div>
                <div className="card-content">
                    <div className="card-title">{item.title}</div>
                    <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img
                            src={item.favicon || `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=16`}
                            alt=""
                            style={{ width: '16px', height: '16px', borderRadius: '2px' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span>{item.siteName || new URL(item.url).hostname}</span>
                        <span>• {item.estimatedReadTime || 5} min</span>
                        {item.content && <span title="Versão backup disponível" style={{ color: '#4caf50' }}>📖</span>}
                    </div>
                    {item.excerpt && (
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                                <span key={`ai-${tag}`} className="card-tag" style={{ border: '1px solid #e0e0e0', background: 'white' }}>✨ {tag}</span>
                            ))}
                        </div>
                    )}
                    <div style={{ flex: 1 }}></div>
                    <div className="card-actions" onClick={stopProp}>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            title="Abrir original"
                            onClick={stopProp}
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            🔗
                        </a>
                        <button
                            className="icon-btn"
                            title={item.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                            onClick={(e) => onToggleFavorite(e, item.id, item.isFavorite)}
                            style={{ color: item.isFavorite ? 'orange' : '' }}
                        >
                            ★
                        </button>
                        <button
                            className="icon-btn"
                            title={item.status === ItemStatus.Archived ? "Desarquivar" : "Arquivar"}
                            onClick={(e) => onToggleArchive(e, item.id, item.status)}
                            style={{ color: item.status === ItemStatus.Archived ? 'green' : '' }}
                        >
                            📥
                        </button>
                        {onEdit && (
                            <button
                                className="icon-btn"
                                title="Editar tags e pasta"
                                onClick={(e) => onEdit(e, item)}
                            >
                                ✏️
                            </button>
                        )}
                        <button
                            className="icon-btn"
                            title="Excluir"
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
