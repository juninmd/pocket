import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
