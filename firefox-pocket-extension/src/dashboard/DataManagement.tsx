import React, { useState } from 'react';
import browser from 'webextension-polyfill';
import { SavedItem } from '../utils/types';
import { getItem } from '../utils/storage';
import { OpenModal } from './useModal';
import { OrganizePreview } from './OrganizePreview';

interface DataManagementProps {
    items: SavedItem[];
    apiKey: string;
    model: string;
    progress: { current: number; total: number };
    onProgress: (p: { current: number; total: number }) => void;
    openModal: OpenModal;
    reload: () => void;
    onOrganized: () => void;
}

const downloadJson = (data: unknown) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'pocket_like_organized.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export const DataManagement = ({ items, apiKey, model, progress, onProgress, openModal, reload, onOrganized }: DataManagementProps) => {
    const [isImporting, setIsImporting] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const fail = (msg: string) => openModal('Erro', msg, 'danger');
    const send = (action: string, payload?: unknown) => browser.runtime.sendMessage({ action, payload }) as Promise<any>;

    const handleExport = async () => {
        setIsDownloading(true);
        try {
            const full = await Promise.all(items.map(async (item) => ({
                ...((await getItem(item.id)) || item),
                folder: item.aiFolder || item.originalFolder || 'Uncategorized',
            })));
            downloadJson(full);
        } catch (e) {
            console.error(e);
            fail('Falha ao exportar itens.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        onProgress({ current: 0, total: 0 });
        try {
            const res = await send('importBookmarks');
            if (res.success) {
                openModal('Sucesso', `✅ ${res.count} favoritos importados com sucesso!`, 'success');
                reload();
            }
        } catch (e) {
            console.error(e);
            fail('Falha ao importar favoritos. Tente novamente.');
        } finally {
            setIsImporting(false);
            onProgress({ current: 0, total: 0 });
        }
    };

    const handleOrganize = async () => {
        if (!apiKey) return openModal('Configuração Necessária', 'Por favor, configure a chave da API Gemini primeiro nas Configurações.');
        if (items.length === 0) return openModal('Ops!', 'Nenhum item para organizar. Salve alguns links primeiro!');
        setIsOrganizing(true);
        try {
            const { success, items: organized, debugLogs } = await send('previewOrganization', { apiKey, model });
            if (success && organized) {
                openModal(
                    'Prévia da Organização',
                    <OrganizePreview total={items.length} organized={organized} debugLogs={debugLogs} />,
                    'default',
                    async () => {
                        await send('applyOrganization', { items: organized });
                        reload();
                        onOrganized();
                        openModal('Sucesso', 'Organização aplicada com sucesso!', 'success');
                    },
                    'Aplicar Mudanças'
                );
            }
        } catch (e) {
            console.error(e);
            fail('Falha ao gerar prévia da organização.');
        } finally {
            setIsOrganizing(false);
        }
    };

    const handleExportToFirefox = async () => {
        setIsExporting(true);
        try {
            const res = await send('exportToFirefox');
            if (res.success) openModal('Sucesso', `${res.count} favoritos exportados para o Firefox!`, 'success');
        } catch (e) {
            console.error(e);
            fail('Falha ao exportar, verifique o console do browser.');
        } finally {
            setIsExporting(false);
        }
    };

    const pct = Math.round((progress.current / (progress.total || 1)) * 100);

    return (
        <div>
            <h3>Gerenciamento de Dados</h3>
            <div className="btn-row">
                <button className="btn secondary" onClick={handleImport} disabled={isImporting}>
                    {isImporting ? 'Importando...' : '📥 Importar Favoritos do Firefox'}
                </button>
                <button className="btn accent" onClick={handleOrganize} disabled={isOrganizing}>
                    {isOrganizing ? 'Organizando...' : '✨ Organizar TUDO com IA'}
                </button>
                <button className="btn secondary" onClick={handleExport} disabled={isDownloading}>📤 Exportar (JSON)</button>
                <button className="btn warm" onClick={handleExportToFirefox} disabled={isExporting}>
                    {isExporting ? 'Exportando...' : '🦊 Exportar para Firefox'}
                </button>
            </div>
            {isImporting && (
                <div className="progress-box" role="status">
                    <div className="progress-head"><span>Importando favoritos...</span><span>{pct}%</span></div>
                    <div className="progress-track"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                    <p className="hint right">{progress.current} de {progress.total} itens processados</p>
                </div>
            )}
        </div>
    );
};
