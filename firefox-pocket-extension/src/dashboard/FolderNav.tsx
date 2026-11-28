import React from 'react';
import { Button } from '@juninmd/sonido';

interface FolderNavProps {
    selectedFolder: string | null;
    onSelect: (path: string | null) => void;
}

export const FolderNav = ({ selectedFolder, onSelect }: FolderNavProps) => {
    const parts = selectedFolder ? selectedFolder.split('/') : [];
    const crumbs = parts.map((name, i) => ({ name, path: parts.slice(0, i + 1).join('/') }));
    const goUp = () => onSelect(parts.length > 1 ? parts.slice(0, -1).join('/') : null);

    return (
        <div className="folder-nav">
            {selectedFolder && <Button variant="ghost" size="sm" onClick={goUp}>⬆ Subir</Button>}
            <nav className="breadcrumbs" aria-label="Caminho da pasta">
                <button type="button" className={`crumb ${!selectedFolder ? 'current' : ''}`}
                    aria-current={!selectedFolder ? 'page' : undefined} onClick={() => onSelect(null)}>Coleções</button>
                {crumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.path}>
                        <span aria-hidden="true">/</span>
                        <button type="button" className={`crumb ${idx === crumbs.length - 1 ? 'current' : ''}`}
                            aria-current={idx === crumbs.length - 1 ? 'page' : undefined} onClick={() => onSelect(crumb.path)}>
                            {crumb.name}
                        </button>
                    </React.Fragment>
                ))}
            </nav>
        </div>
    );
};
