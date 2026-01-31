import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Dashboard from './Dashboard';
import browser from 'webextension-polyfill';
import { ItemStatus } from '../utils/types';

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
    });

    it('should handle export JSON', async () => {
         (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [mockItem] });
         const createObjectURLMock = jest.fn().mockReturnValue('blob:url');
         const revokeObjectURLMock = jest.fn();
         global.URL.createObjectURL = createObjectURLMock;
         global.URL.revokeObjectURL = revokeObjectURLMock;

         const clickSpy = jest.spyOn(HTMLElement.prototype, 'click');

         render(<Dashboard />);
         fireEvent.click(screen.getByText('Configurações'));
         fireEvent.click(screen.getByText('📤 Exportar (JSON)'));

         expect(createObjectURLMock).toHaveBeenCalled();
         expect(clickSpy).toHaveBeenCalled();

         clickSpy.mockRestore();
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

    it('should handle API key save timeout', async () => {
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
             // Wrap in act if needed, but fireEvent handles act usually.
             // Since listener is called from outside React, we might need act.
             // But waitFor handles it.
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
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
            geminiApiKey: 'key',
            selectedModel: 'gemini-1.5-pro'
        });
        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        await waitFor(() => expect(screen.getByDisplayValue('key')).toBeInTheDocument());

        const select = screen.getByRole('combobox');
        expect((select as HTMLSelectElement).value).toBe('gemini-1.5-pro');
    });

    it('should search by URL only (Explicit)', async () => {
        const item = { ...mockItem, title: 'Unique Title', url: 'http://specific-url.com' };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item] });
        render(<Dashboard />);
        await waitFor(() => expect(screen.getByText('Unique Title')).toBeInTheDocument());

        const input = screen.getByPlaceholderText('Pesquisar...');
        // Search for something only in URL, not title
        fireEvent.change(input, { target: { value: 'specific-url' } });

        await waitFor(() => expect(screen.getByText('Unique Title')).toBeInTheDocument());
    });

    it('should filter by aiTags only', async () => {
        // Item with AI tag but undefined regular tag
        const item = { ...mockItem, tags: undefined, aiTags: ['magic'] };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item] });
        render(<Dashboard />);

        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('#magic')).toBeInTheDocument());

        fireEvent.click(screen.getByText('#magic'));
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());
    });

    it('should handle empty filtered result with selected tag', async () => {
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });
        const item = { ...mockItem, tags: ['temp'] };
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [item] });
        render(<Dashboard />);

        // Go to collection
        fireEvent.click(screen.getByText('Coleções'));
        await waitFor(() => expect(screen.getByText('#temp')).toBeInTheDocument());
        fireEvent.click(screen.getByText('#temp'));
        await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument());

        // Now empty items (background update)
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ items: [] });
        if (listener) {
            React.act(() => {
                listener({ action: 'itemsUpdated' });
            });
        }

        // Should see empty state
        await waitFor(() => expect(screen.getByText('Nenhum item com a tag #temp')).toBeInTheDocument());

        // Go back button
        const backBtn = screen.getByText('Voltar para Coleções');
        fireEvent.click(backBtn);

        // Should be back to main Collections view (which is now empty too, but correct view)
        expect(screen.queryByText('Nenhum item com a tag #temp')).not.toBeInTheDocument();
    });

    it('should handle import progress bar width with zero total', async () => {
        let listener: any;
        (browser.runtime.onMessage.addListener as jest.Mock).mockImplementation((l) => { listener = l; });
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'importBookmarks') return new Promise(() => {});
            return Promise.resolve({ items: [] });
        });

        render(<Dashboard />);
        fireEvent.click(screen.getByText('Configurações'));
        fireEvent.click(screen.getByText('📥 Importar Favoritos do Firefox'));

        if (listener) {
             React.act(() => {
                // total 0 to trigger division by 1 fallback
                listener({ action: 'importProgress', payload: { current: 0, total: 0 } });
             });
        }

        await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument());
    });
});
