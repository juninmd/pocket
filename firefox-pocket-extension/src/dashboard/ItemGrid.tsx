import React from 'react';
import { SavedItem, ItemStatus } from '../utils/types';
import { ItemCard } from '../components/ItemCard';

export interface ItemActions {
    onToggleFavorite: (e: React.MouseEvent, id: string, isFavorite: boolean) => void;
    onToggleArchive: (e: React.MouseEvent, id: string, status: ItemStatus) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onEdit: (e: React.MouseEvent, item: SavedItem) => void;
}

export const ItemGrid = ({ items, actions }: { items: SavedItem[]; actions: ItemActions }) => (
    <div className="grid">
        {items.map(item => <ItemCard key={item.id} item={item} {...actions} />)}
    </div>
);
