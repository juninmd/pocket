import React, { useState, useEffect } from 'react';
import { Badge, Button, TextField } from '@juninmd/sonido';
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
                    <Button variant="secondary" className="secondary-btn" onClick={onClose}>Cancelar</Button>
                    <Button className="primary-btn" onClick={() => item && onSave(item, tags, folder)}>Salvar</Button>
                </>
            }
        >
            <div className="form-stack">
                <TextField
                    label="Pasta"
                    value={folder}
                    placeholder="Ex: Tecnologia/React"
                    onChange={(e) => setFolder(e.target.value)}
                />
                <div>
                    <div className="tag-list">
                        {tags.map(tag => (
                            <Badge key={tag} tone="accent" appearance="soft" className="tag chip">
                                {tag}
                                <button type="button" aria-label={`Remover ${tag}`} onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
                            </Badge>
                        ))}
                    </div>
                    <TextField
                        label="Tags"
                        placeholder="Adicionar tag e pressione Enter"
                        onKeyDown={(e) => e.key === 'Enter' && addTag(e.target as HTMLInputElement)}
                    />
                </div>
            </div>
        </Modal>
    );
};
