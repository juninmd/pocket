import React from 'react';

export type ViewType = 'home' | 'favorites' | 'archive' | 'discover' | 'collections' | 'settings';

const NAV: (ViewType | 'divider')[][] = [
    ['home', 'favorites', 'archive'],
    ['discover', 'collections'],
    ['settings'],
];

const LABELS: Record<ViewType, string> = {
    home: 'Início',
    favorites: 'Favoritos',
    archive: 'Arquivo',
    discover: 'Redescobrir',
    collections: 'Coleções',
    settings: 'Configurações',
};

interface SidebarProps {
    activeView: ViewType;
    onChange: (view: ViewType) => void;
}

export const Sidebar = ({ activeView, onChange }: SidebarProps) => (
    <nav className="sidebar" aria-label="Navegação principal">
        <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4056" aria-hidden="true">
                <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
            pocket-like
        </div>
        {NAV.map((group, i) => (
            <React.Fragment key={i}>
                {i > 0 && <div className="nav-divider" />}
                {group.map(view => view !== 'divider' && (
                    <button
                        key={view}
                        type="button"
                        className={`nav-item ${activeView === view ? 'active' : ''}`}
                        aria-current={activeView === view ? 'page' : undefined}
                        onClick={() => onChange(view)}
                    >
                        {LABELS[view]}
                    </button>
                ))}
            </React.Fragment>
        ))}
    </nav>
);
