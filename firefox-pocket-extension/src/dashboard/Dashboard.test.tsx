import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Dashboard from './Dashboard';
import browser from 'webextension-polyfill';
import { ItemStatus } from '../utils/types';
import { getItem } from '../utils/storage';

jest.mock('../utils/storage', () => ({
    getItem: jest.fn()
}));

jest.mock('webextension-polyfill', () => ({
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        }
    },
    tabs: {
        create: jest.fn()
    }
}));

// Mock ItemCard since it's tested separately
jest.mock('../components/ItemCard', () => ({
    ItemCard: ({ item, onDelete, onToggleFavorite, onToggleArchive }: any) => (
        <div data-testid="item-card">
            <span>{item.title}</span>
            <button onClick={(e) => onDelete(e, item.id)}>Delete</button>
            <button onClick={(e) => onToggleFavorite(e, item.id, item.isFavorite)}>Favorite</button>
            <button onClick={(e) => onToggleArchive(e, item.id, item.status)}>Archive</button>
        </div>
    )
}));

describe('Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.URL.createObjectURL = jest.fn();
        global.URL.revokeObjectURL = jest.fn();
        global.alert = jest.fn();
    });

    const mockItem = {
        id: '1',
        title: 'Test Item',
        url: 'http://test.com',
        status: ItemStatus.Unread,
        isFavorite: false,
        tags: ['tech'],
        aiFolder: 'Technology'
    };

    beforeEach(() => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });
    });

    it('should render and load items', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);

        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());
        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ action: 'getLinks' });
    });

    it('should navigate views', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        // Go to Favorites
        fireEvent.click(screen.getByText('Favoritos'));
        expect(screen.queryByText('Test Item')).not.toBeInTheDocument(); // It is not favorite

        // Go back Home
        fireEvent.click(screen.getByText('Início'));
        expect(screen.getByText('Test Item')).toBeInTheDocument();

        // Go to Archive
        fireEvent.click(screen.getByText('Arquivo'));
        expect(screen.queryByText('Test Item')).not.toBeInTheDocument();
    });

    it('should handle search', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText('Pesquisar...');
        fireEvent.change(searchInput, { target: { value: 'NotFound' } });

        expect(screen.queryByText('Test Item')).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'Test' } });
        expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('should handle item actions', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        // Favorite
        fireEvent.click(screen.getByText('Favorite'));
        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'updateLink',
            payload: { id: '1', updates: { isFavorite: true } }
        }));

        // Archive
        fireEvent.click(screen.getByText('Archive'));
        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'updateLink',
            payload: { id: '1', updates: { status: ItemStatus.Archived } }
        }));

        // Delete (triggers modal)
        fireEvent.click(screen.getByText('Delete'));
        expect(screen.getByText('Excluir Item')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Excluir')); // Confirm in modal
        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'deleteLink',
            payload: { id: '1' }
        }));
    });

    it('should handle settings API Key', async () => {
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        const input = screen.getByPlaceholderText('Cole sua API Key aqui');
        fireEvent.change(input, { target: { value: 'new-key' } });
        fireEvent.click(screen.getByText('Salvar Key'));

        await waitFor(() => expect(browser.storage.local.set).toHaveBeenCalledWith({ geminiApiKey: 'new-key' }));
    });

    it('should handle Organize AI flow', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [mockItem] });
             if (msg.action === 'previewOrganization') return Promise.resolve({ success: true, items: [{ ...mockItem, aiFolder: 'NewFolder' }] });
             return Promise.resolve({});
        });

        render(<Dashboard />);

        // Wait for key loading to settle
        await waitFor(() => expect(browser.storage.local.get).toHaveBeenCalled());

        // Go to Settings
        fireEvent.click(screen.getByText('Configurações'));

        // Click Organize
        const organizeBtn = screen.getByText('✨ Organizar TUDO com IA');
        fireEvent.click(organizeBtn);

        // Wait for preview modal
        await waitFor(() => expect(screen.getByText('Prévia da Organização')).toBeInTheDocument());

        // Confirm
        fireEvent.click(screen.getByText('Aplicar Mudanças'));

        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'applyOrganization',
            payload: expect.anything()
        }));
    });

    it('should discover view', async () => {
        const unreadItem = { ...mockItem, status: ItemStatus.Unread };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [unreadItem] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Redescobrir'));
        await waitFor(() => expect(screen.getByText('REDESCOBRIR')).toBeInTheDocument());

        // Verify search bar is NOT present
        expect(screen.queryByPlaceholderText('Pesquisar...')).not.toBeInTheDocument();
    });

    it('should collections view', async () => {
         (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
         render(<Dashboard />);

         fireEvent.click(screen.getByText('Coleções'));
         await waitFor(() => expect(screen.getByText('#tech')).toBeInTheDocument());

         // Click tag
         fireEvent.click(screen.getByText('#tech'));
         expect(screen.getByText('Test Item')).toBeInTheDocument();

         // Go back
         fireEvent.click(screen.getByText('← Voltar'));
         expect(screen.getByText('#tech')).toBeInTheDocument();
    });

    it('should filter by AI tags', async () => {
        const aiTagItem = { ...mockItem, id: '2', title: 'AI Tag Item', tags: [], aiTags: ['ai-tech'] };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [aiTagItem] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('#ai-tech')).toBeInTheDocument());

        fireEvent.click(screen.getByText('#ai-tech'));
        expect(screen.getByText('AI Tag Item')).toBeInTheDocument();
    });

    it('should navigate folder structure', async () => {
         const folderItem = { ...mockItem, aiFolder: 'Tech/Web' };
         (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [folderItem] });
         render(<Dashboard />);

         fireEvent.click(screen.getByText('Coleções'));
         await waitFor(() => expect(screen.getByText('Tech')).toBeInTheDocument());

         // Enter Tech
         fireEvent.click(screen.getByText('Tech'));
         await waitFor(() => expect(screen.getByText('Web')).toBeInTheDocument());
         expect(screen.getByText('Tech')).toBeInTheDocument(); // Breadcrumb

         // Enter Web
         fireEvent.click(screen.getByText('Web'));
         await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());
         expect(screen.getByText('Web')).toBeInTheDocument(); // Breadcrumb

         // Navigate up via breadcrumb
         fireEvent.click(screen.getByText('Tech'));
         await waitFor(() => expect(screen.getByText('Web')).toBeInTheDocument());

         // Navigate up button
         fireEvent.click(screen.getByText('⬆ Subir'));
         await waitFor(() => expect(screen.getByText('Tech')).toBeInTheDocument());

         // Navigate via Breadcrumb "Coleções"
         fireEvent.click(screen.getByText('Tech')); // Go deep again
         await waitFor(() => expect(screen.getByText('Web')).toBeInTheDocument());

         // Click root breadcrumb (might be multiple "Coleções" text, take the breadcrumb one)
         const colTexts = screen.getAllByText('Coleções');
         fireEvent.click(colTexts[colTexts.length - 1]);

         await waitFor(() => expect(screen.getByText('#tech')).toBeInTheDocument()); // Back to root tags
    });

    it('should handle export JSON', async () => {
         (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
         (getItem as jest.Mock).mockResolvedValue(mockItem);

         const createObjectURLMock = jest.fn().mockReturnValue('blob:url');
         const revokeObjectURLMock = jest.fn();
         global.URL.createObjectURL = createObjectURLMock;
         global.URL.revokeObjectURL = revokeObjectURLMock;

         const clickSpy = jest.spyOn(HTMLElement.prototype, 'click');
         const removeSpy = jest.spyOn(HTMLElement.prototype, 'remove');

         render(<Dashboard />);
         await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

         fireEvent.click(screen.getByText('Configurações'));
         fireEvent.click(screen.getByText('📤 Exportar (JSON)'));

         await waitFor(() => expect(createObjectURLMock).toHaveBeenCalled());
         expect(clickSpy).toHaveBeenCalled();
         expect(removeSpy).toHaveBeenCalled();
         expect(getItem).toHaveBeenCalledWith('1');

         clickSpy.mockRestore();
         removeSpy.mockRestore();
    });

    it('should handle import bookmarks', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [] });
             if (msg.action === 'importBookmarks') return Promise.resolve({ success: true, count: 5 });
             return Promise.resolve({});
        });

        fireEvent.click(screen.getByText('📥 Importar Favoritos do Firefox'));

        await waitFor(() => expect(screen.getByText('Sucesso')).toBeInTheDocument());
        expect(screen.getByText('✅ 5 favoritos importados com sucesso!')).toBeInTheDocument();
        fireEvent.click(screen.getByText('OK'));
    });

    it.skip('should handle API key save timeout', async () => {
        jest.useFakeTimers();
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        const saveBtn = screen.getByText('Salvar Key');
        fireEvent.click(saveBtn);

        await waitFor(() => expect(screen.getByText('Salvo!')).toBeInTheDocument());

        jest.advanceTimersByTime(1000);

        await waitFor(() => expect(screen.getByText('Salvar Key')).toBeInTheDocument());
        jest.useRealTimers();
    });

    it('should handle import progress', async () => {
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'importBookmarks') return new Promise(() => {}); // Hang to keep isImporting true
            return Promise.resolve({ items: [] });
        });

        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        fireEvent.click(screen.getByText('📥 Importar Favoritos do Firefox')); // Trigger import to set isImporting=true

        // Ensure isImporting is true
        expect(screen.getByText('Importando...')).toBeInTheDocument();

        // Trigger progress update
        if (listener) {
             React.act(() => {
                listener({ action: 'importProgress', payload: { current: 50, total: 100 } });
             });
        }

        await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('50 de 100 itens processados')).toBeInTheDocument());
    });

    it('should handle filtered view empty states', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });
        render(<Dashboard />);

        // Home empty
        await waitFor(() => expect(screen.getByText('Salve alguns links para começar!')).toBeInTheDocument());

        // Favorites empty
        fireEvent.click(screen.getByText('Favoritos'));
        expect(screen.getByText('Salve alguns links para começar!')).toBeInTheDocument();

        // Cleanup and new render
        cleanup();

        // Collection with tag empty
        const tagItem = { ...mockItem, tags: ['tag1'] };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [tagItem] });
        render(<Dashboard />); // Rerender with items

        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('#tag1')).toBeInTheDocument());
        fireEvent.click(screen.getByText('#tag1'));

        // Now simulate empty result for a tag (impossible in UI flow usually but component handles it)
        // If we filter by a tag that no item has?
        // But let's check empty state text for filteredItems === 0
        expect(screen.queryByText('Nenhum item com a tag #tag1')).not.toBeInTheDocument(); // It has items

        // Force empty state by clearing items but keeping tag
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });
    });

    it('should handle empty tag result and back button', async () => {
        const tagItem = { ...mockItem, tags: ['tag1'] };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [tagItem] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('#tag1')).toBeInTheDocument());
        fireEvent.click(screen.getByText('#tag1'));

        // Now mock empty items and trigger reload
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });

        // Click delete on the item.
        fireEvent.click(screen.getByText('Delete'));
        fireEvent.click(screen.getByText('Excluir'));

        // The component optimistically updates or re-fetches?
        // If it re-fetches, we need to ensure the promise resolves.
        // Assuming optimistic update or auto-reload on delete success.

        await waitFor(() => expect(screen.getByText('Nenhum item com a tag #tag1')).toBeInTheDocument());

        // Click back
        fireEvent.click(screen.getByText('Voltar para Coleções'));
        expect(screen.queryByText('Nenhum item com a tag #tag1')).not.toBeInTheDocument();
    });

    it('should handle empty tag result and back button robustly', async () => {
        const tagItem = { ...mockItem, tags: ['tag1'] };
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });

        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [tagItem] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('#tag1')).toBeInTheDocument());
        fireEvent.click(screen.getByText('#tag1'));

        // Mock empty items for next fetch
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });

        // Trigger update
        if (listener) {
             React.act(() => {
                listener({ action: 'itemsUpdated' });
             });
        }

        await waitFor(() => expect(screen.getByText('Nenhum item com a tag #tag1')).toBeInTheDocument());

        // This button is line 689
        const backBtn = screen.getByText('Voltar para Coleções');
        fireEvent.click(backBtn);

        expect(screen.queryByText('Nenhum item com a tag #tag1')).not.toBeInTheDocument();
    });

    it('should handle delete confirmation cancel', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Delete'));
        expect(screen.getByText('Excluir Item')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancelar'));
        await waitFor(() => expect(screen.queryByText('Excluir Item')).not.toBeInTheDocument());

        expect(browser.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'deleteLink' }));
    });

    it('should handle export to Firefox', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [] });
             if (msg.action === 'exportToFirefox') return Promise.resolve({ success: true, count: 3 });
             return Promise.resolve({});
        });

        fireEvent.click(screen.getByText('🦊 Exportar para Firefox'));

        await waitFor(() => expect(screen.getByText('Sucesso')).toBeInTheDocument());
        expect(screen.getByText('3 favoritos exportados para o Firefox!')).toBeInTheDocument();
    });

    it('should handle API missing for organize', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({}); // No key
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        fireEvent.click(screen.getByText('✨ Organizar TUDO com IA'));
        await waitFor(() => expect(screen.getByText('Configuração Necessária')).toBeInTheDocument());
    });

    it('should handle no items for organize', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        // Wait for key to be loaded
        await waitFor(() => expect(screen.getByDisplayValue('key')).toBeInTheDocument());

        fireEvent.click(screen.getByText('✨ Organizar TUDO com IA'));
        await waitFor(() => expect(screen.getByText('Ops!')).toBeInTheDocument());
    });

    it('should handle discover empty state', async () => {
        const archivedItem = { ...mockItem, status: ItemStatus.Archived };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [archivedItem] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Redescobrir'));
        await waitFor(() => expect(screen.getByText('Sem itens para redescobrir')).toBeInTheDocument());
    });

    it('should handle load items error', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Load Fail'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        render(<Dashboard />);
        await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith("Failed to load items", expect.any(Error)));
        consoleSpy.mockRestore();
    });

    it('should handle import error', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [] });
             if (msg.action === 'importBookmarks') return Promise.reject(new Error('Import Fail'));
             return Promise.resolve({});
        });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        fireEvent.click(screen.getByText('📥 Importar Favoritos do Firefox'));
        await waitFor(() => expect(screen.getByText('Erro')).toBeInTheDocument());
    });

    it('should handle export to Firefox error', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [] });
             if (msg.action === 'exportToFirefox') return Promise.reject(new Error('Export Fail'));
             return Promise.resolve({});
        });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        fireEvent.click(screen.getByText('🦊 Exportar para Firefox'));
        await waitFor(() => expect(screen.getByText('Erro')).toBeInTheDocument());
    });

    it('should handle organize preview error', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [mockItem] });
             if (msg.action === 'previewOrganization') return Promise.reject(new Error('Preview Fail'));
             return Promise.resolve({});
        });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        await waitFor(() => expect(screen.getByDisplayValue('key')).toBeInTheDocument());
        fireEvent.click(screen.getByText('✨ Organizar TUDO com IA'));
        await waitFor(() => expect(screen.getByText('Erro')).toBeInTheDocument());
    });

    it('should handle export JSON error', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        (getItem as jest.Mock).mockRejectedValue(new Error('Export JSON Fail'));

        render(<Dashboard />);
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Configurações'));
        fireEvent.click(screen.getByText('📤 Exportar (JSON)'));

        await waitFor(() => expect(screen.getByText('Erro')).toBeInTheDocument());
    });

    it('should search by URL', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
        render(<Dashboard />);
        const input = screen.getByPlaceholderText('Pesquisar...');
        fireEvent.change(input, { target: { value: 'test.com' } });
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());
    });

    it('should list folders from originalFolder', async () => {
        const item = { ...mockItem, aiFolder: undefined, originalFolder: 'Bookmarks/Old' };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('Bookmarks')).toBeInTheDocument());
    });

    it('should reload items on update message', async () => {
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });

        render(<Dashboard />);

        // Update mock to return item
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });

        // Trigger listener
        if (listener) {
            listener({ action: 'itemsUpdated' });
        }

        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());
    });

    it('should ignore irrelevant messages', async () => {
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });
        render(<Dashboard />);

        // Trigger irrelevant listener
        if (listener) {
            listener({ action: 'other' });
        }
        // Expect NO reload (sendMessage call count stays same)
        expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1); // 1 for initial load
    });

    it('should handle deleted folder gracefully', async () => {
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });
        const item = { ...mockItem, aiFolder: 'Tech' };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('Tech')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Tech'));
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        // Simulate delete (reload items as empty)
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });

        if (listener) {
            listener({ action: 'itemsUpdated' });
        }

        await waitFor(() => expect(screen.queryByText('Test Item')).not.toBeInTheDocument());
        expect(screen.getByText('Esta pasta está vazia.')).toBeInTheDocument();
    });

    it('should load selectedModel from storage', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key', selectedModel: 'gemini-1.5-pro' });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        await waitFor(() => expect(screen.getByDisplayValue('Gemini 1.5 Pro (Grátis + Avançado)')).toBeInTheDocument());
    });

    it('should change selectedModel', async () => {
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));

        // Find select by text label "Modelo de IA" or just verify existence of select
        const select = screen.getByRole('combobox'); // Assuming only one select
        fireEvent.change(select, { target: { value: 'gemini-2.5-pro' } });

        await waitFor(() => expect(browser.storage.local.set).toHaveBeenCalledWith({ selectedModel: 'gemini-2.5-pro' }));
    });

    it('should search within collection folder', async () => {
         const item1 = { ...mockItem, id: '1', title: 'FindMe', aiFolder: 'Tech' };
         const item2 = { ...mockItem, id: '2', title: 'HideMe', aiFolder: 'Tech' };
         (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item1, item2] });

         render(<Dashboard />);
         fireEvent.click(screen.getByText('Coleções'));
         await waitFor(() => expect(screen.getByText('Tech')).toBeInTheDocument());
         fireEvent.click(screen.getByText('Tech'));

         await waitFor(() => expect(screen.getByText('FindMe')).toBeInTheDocument());

         const input = screen.getByPlaceholderText('Pesquisar...');
         fireEvent.change(input, { target: { value: 'FindMe' } });

         expect(screen.getByText('FindMe')).toBeInTheDocument();
         expect(screen.queryByText('HideMe')).not.toBeInTheDocument();
    });

    it('should discover view with and without image', async () => {
        const itemWithImg = { ...mockItem, id: '1', title: 'With Image', status: ItemStatus.Unread, imageUrl: 'http://img.com/1.jpg' };
        const itemNoImg = { ...mockItem, id: '2', title: 'No Image', status: ItemStatus.Unread, imageUrl: undefined };

        // Test With Image
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [itemWithImg] });
        const { unmount } = render(<Dashboard />);
        fireEvent.click(screen.getByText('Redescobrir'));
        await waitFor(() => expect(screen.getByText('With Image')).toBeInTheDocument());

        unmount();

        // Test No Image
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [itemNoImg] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Redescobrir'));
        await waitFor(() => expect(screen.getByText('No Image')).toBeInTheDocument());
    });

    it('should click next item in discover', async () => {
        const item1 = { ...mockItem, id: '1', status: ItemStatus.Unread };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item1] });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Redescobrir'));
        await waitFor(() => expect(screen.getByText('REDESCOBRIR')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Próximo Item'));
        expect(browser.runtime.sendMessage).toHaveBeenCalled(); // Just checks interaction
    });

    it('should disable import button while importing', async () => {
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
             if (msg.action === 'getLinks') return Promise.resolve({ items: [] });
             if (msg.action === 'importBookmarks') return new Promise(() => {}); // Hang
             return Promise.resolve({});
        });

        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        const btn = screen.getByText('📥 Importar Favoritos do Firefox');
        fireEvent.click(btn);

        await waitFor(() => expect(btn).toBeDisabled());
    });
});
