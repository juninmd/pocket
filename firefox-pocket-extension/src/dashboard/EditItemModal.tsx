import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { SavedItem } from '../utils/types';

interface EditItemModalProps {
    item: SavedItem | null;
    onClose: () => void;
    onSave: (item: SavedItem, tags: string[], folder: string) => void;
}

export const EditItemModal = ({ item, onClose, onSave }: EditItemModalProps) => {
    const [tags, setTags] = useState<string[]>([]);
    const [folder, setFolder] = useState('');

    useEffect(() => {
        if (item) {
            setTags(item.tags || []);
            setFolder(item.aiFolder || item.originalFolder || '');
        }
    }, [item]);

    const addTag = (input: HTMLInputElement) => {
        const val = input.value.trim();
        if (val && !tags.includes(val)) {
            setTags([...tags, val]);
            input.value = '';
        }
    };

    return (
        <Modal
            isOpen={!!item}
            onClose={onClose}
            title="Editar Item"
            footer={
                <>
                    <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
                    <button type="button" className="primary-btn" onClick={() => item && onSave(item, tags, folder)}>Salvar</button>
                </>
            }
        >
            <div className="form-stack">
                <div>
                    <label className="field-label" htmlFor="edit-folder">Pasta</label>
                    <input id="edit-folder" type="text" className="search-bar full" value={folder} placeholder="Ex: Tecnologia/React"
                        onChange={(e) => setFolder(e.target.value)} />
                </div>
                <div>
                    <label className="field-label" htmlFor="edit-tag">Tags</label>
                    <div className="tag-list">
                        {tags.map(tag => (
                            <span key={tag} className="tag chip">
                                {tag}
                                <button type="button" aria-label={`Remover ${tag}`} onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
                            </span>
                        ))}
                    </div>
                    <input id="edit-tag" type="text" className="search-bar full" placeholder="Adicionar tag e pressione Enter"
                        onKeyDown={(e) => e.key === 'Enter' && addTag(e.target as HTMLInputElement)} />
                </div>
            </div>
        </Modal>
    );
};
