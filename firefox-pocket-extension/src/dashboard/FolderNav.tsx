import React from 'react';

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
            {selectedFolder && <button className="btn ghost" onClick={goUp}>⬆ Subir</button>}
            <div className="breadcrumbs">
                <span className={`crumb ${!selectedFolder ? 'current' : ''}`} onClick={() => onSelect(null)}>Coleções</span>
                {crumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.path}>
                        <span>/</span>
                        <span className={`crumb ${idx === crumbs.length - 1 ? 'current' : ''}`} onClick={() => onSelect(crumb.path)}>
                            {crumb.name}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
