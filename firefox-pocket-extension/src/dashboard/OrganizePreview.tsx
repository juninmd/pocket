import React from 'react';
import { SavedItem } from '../utils/types';

interface OrganizePreviewProps {
    total: number;
    organized: SavedItem[];
    debugLogs?: unknown;
}

export const OrganizePreview = ({ total, organized, debugLogs }: OrganizePreviewProps) => {
    const counts: Record<string, number> = {};
    organized.forEach(item => {
        const folder = item.aiFolder || 'Outros';
        counts[folder] = (counts[folder] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return (
        <div className="preview">
            <p>A IA sugeriu a seguinte estrutura para seus {total} itens:</p>
            <div className="preview-grid">
                {sorted.map(([folder, count]) => (
                    <React.Fragment key={folder}>
                        <div className="preview-folder">📁 {folder}</div>
                        <div className="preview-count">{count} itens</div>
                    </React.Fragment>
                ))}
            </div>
            {!!debugLogs && (
                <details className="preview-debug">
                    <summary>🔍 Detalhes Técnicos (Debug)</summary>
                    <pre>{JSON.stringify(debugLogs, null, 2)}</pre>
                </details>
            )}
            <p className="hint">Deseja aplicar estas mudanças?</p>
        </div>
    );
};
