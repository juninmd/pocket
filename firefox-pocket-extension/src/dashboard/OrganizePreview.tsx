import React from 'react';
import { Badge } from '@juninmd/sonido';
import { SavedItem } from '../utils/types';

interface OrganizePreviewProps {
    total: number;
    organized: SavedItem[];
    debugLogs?: unknown;
}

// analyzeAllItems swallows Gemini errors and records them as `error` in each batch log.
const countFailedBatches = (debugLogs: unknown): { failed: number; batches: number } => {
    if (!Array.isArray(debugLogs)) return { failed: 0, batches: 0 };
    const failed = debugLogs.filter(log => !!(log as { error?: unknown } | null)?.error).length;
    return { failed, batches: debugLogs.length };
};

export const OrganizePreview = ({ total, organized, debugLogs }: OrganizePreviewProps) => {
    const counts: Record<string, number> = {};
    organized.forEach(item => {
        const folder = item.aiFolder || 'Outros';
        counts[folder] = (counts[folder] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const { failed, batches } = countFailedBatches(debugLogs);

    return (
        <div className="preview">
            {failed > 0 && (
                <p role="alert" className="preview-warning">
                    {failed === batches
                        ? '⚠️ A IA não conseguiu responder (veja os detalhes técnicos). Nenhum item foi organizado.'
                        : `⚠️ A IA falhou em ${failed} de ${batches} lotes; os itens desses lotes ficaram sem organização.`}
                </p>
            )}
            <p>A IA sugeriu a seguinte estrutura para seus {total} itens:</p>
            <div className="preview-grid">
                {sorted.map(([folder, count]) => (
                    <React.Fragment key={folder}>
                        <div className="preview-folder">📁 {folder}</div>
                        <div className="preview-count"><Badge tone="neutral" appearance="count">{count}</Badge> itens</div>
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
