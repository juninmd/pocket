import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Popup from './Popup';
import browser from 'webextension-polyfill';
import { ItemStatus, ItemType } from '../utils/types';

jest.mock('webextension-polyfill', () => ({
    tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        create: jest.fn()
    },
    runtime: {
        sendMessage: jest.fn()
    }
}));

jest.mock('./Mascot', () => ({ message }: { message: string }) => <div data-testid="mascot">{message}</div>);

describe('Popup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should show loading state initially', () => {
        (browser.tabs.query as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolve to keep loading
        render(<Popup />);
        expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('should show error if no tab', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([]);
        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Não foi possível acessar a página.')).toBeInTheDocument());
    });

    it('should show error if tab has no url', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ id: 1 }]); // No URL
        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Não foi possível acessar a página.')).toBeInTheDocument());
    });

    it('should show not saved view if item not found', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: false });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('O que deseja fazer?')).toBeInTheDocument());
        expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument();
    });

    it('should show saved view if item found', async () => {
        const mockItem = {
            id: '1',
            title: 'Test',
            url: 'http://example.com',
            tags: ['tag1']
        };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Link Salvo!')).toBeInTheDocument());
        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.getByText('tag1')).toBeInTheDocument();
    });

    it('should handle save action', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1, title: 'Test Page' }]);
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.resolve({ success: true, item: { id: '1', title: 'Test Page', tags: [] } });
            return Promise.resolve({});
        });
        (browser.tabs.sendMessage as jest.Mock).mockResolvedValue({ description: 'desc' });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        expect(screen.getByText('Salvando...')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('Link Salvo!')).toBeInTheDocument());
    });

    it('should handle open dashboard', async () => {
         (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
         (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: false });

         // Mock window.close
         const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});

         render(<Popup />);
         await waitFor(() => expect(screen.getByText('📂 Abrir Minha Lista')).toBeInTheDocument());

         fireEvent.click(screen.getByText('📂 Abrir Minha Lista'));

         expect(browser.tabs.create).toHaveBeenCalledWith({ url: 'dashboard.html' });
         expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle add tag', async () => {
        const mockItem = { id: '1', title: 'Test', url: 'http://example.com', tags: [] };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });

        render(<Popup />);
        await waitFor(() => expect(screen.getByPlaceholderText('Adicionar tags...')).toBeInTheDocument());

        const input = screen.getByPlaceholderText('Adicionar tags...');
        fireEvent.change(input, { target: { value: 'newtag' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            action: 'updateLink',
            payload: { id: '1', updates: { tags: ['newtag'] } }
        })));
    });

    it('should handle remove tag', async () => {
         const mockItem = { id: '1', title: 'Test', url: 'http://example.com', tags: ['tag1'] };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('tag1')).toBeInTheDocument());

        fireEvent.click(screen.getByText('×'));

         await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            action: 'updateLink',
            payload: { id: '1', updates: { tags: [] } }
        })));
    });

    it('should handle archive', async () => {
         const mockItem = { id: '1', title: 'Test', url: 'http://example.com', tags: [] };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });
         const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});

        render(<Popup />);
        await waitFor(() => expect(screen.getByTitle('Arquivar')).toBeInTheDocument());

        fireEvent.click(screen.getByTitle('Arquivar'));

        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            action: 'updateLink',
            payload: { id: '1', updates: { status: ItemStatus.Archived } }
        })));
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle delete', async () => {
         const mockItem = { id: '1', title: 'Test', url: 'http://example.com', tags: [] };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });
         const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {});

        render(<Popup />);
        await waitFor(() => expect(screen.getByTitle('Excluir')).toBeInTheDocument());

        fireEvent.click(screen.getByTitle('Excluir'));

        await waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            action: 'deleteLink',
            payload: { id: '1' }
        })));
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle error when checking saved status', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockRejectedValue(new Error('Network error'));

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Não foi possível acessar a página.')).toBeInTheDocument());
    });

    it('should handle save failure', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.resolve({ success: false }); // Save failed
            return Promise.resolve({});
        });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        await waitFor(() => expect(screen.getByText('Não foi possível acessar a página.')).toBeInTheDocument());
    });

    it('should show error when saveLink rejects instead of hanging', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ id: 1, url: 'https://example.com', title: 'Ex' }]);
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.reject(new Error('boom'));
            return Promise.resolve({});
        });
        jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());
        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível acessar a página.'));
    });

    it('should handle metadata fetch error during save', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.resolve({ success: true, item: { id: '1', title: 'Fallback', tags: [] } });
            return Promise.resolve({});
        });

        // Mock metadata fetch failure
        (browser.tabs.sendMessage as jest.Mock).mockRejectedValue(new Error('Metadata fail'));

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        // Should still save (fallback)
        await waitFor(() => expect(screen.getByText('Link Salvo!')).toBeInTheDocument());
        expect(browser.tabs.sendMessage).toHaveBeenCalled();
        // Check that saveLink was called with fallback info (no metadata)
        expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            action: 'saveLink',
            payload: expect.not.objectContaining({ description: expect.anything() })
        }));
    });

    it('should save without metadata if tab id is missing', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com' }]); // No ID
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.resolve({ success: true, item: { id: '1', title: 'Fallback', tags: [] } });
            return Promise.resolve({});
        });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        await waitFor(() => expect(screen.getByText('Link Salvo!')).toBeInTheDocument());
        expect(browser.tabs.sendMessage).not.toHaveBeenCalled(); // No ID, so no message
    });

    it('should handle empty response from check saved', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue(null);

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('O que deseja fazer?')).toBeInTheDocument());
    });

    it('should handle missing item in check saved response', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true }); // No item

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('O que deseja fazer?')).toBeInTheDocument());
    });

    it('should handle missing item in save response', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.resolve({ success: true }); // No item
            return Promise.resolve({});
        });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        await waitFor(() => expect(screen.getByText('Não foi possível acessar a página.')).toBeInTheDocument());
    });

    it('should handle empty response from save', async () => {
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockImplementation((msg: any) => {
            if (msg.action === 'getLink') return Promise.resolve({ success: false });
            if (msg.action === 'saveLink') return Promise.resolve(null);
            return Promise.resolve({});
        });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('💾 Salvar Esta Página')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💾 Salvar Esta Página'));

        await waitFor(() => expect(screen.getByText('Não foi possível acessar a página.')).toBeInTheDocument());
    });

    it('should not add tag if input empty or other key', async () => {
        const mockItem = { id: '1', title: 'Test', url: 'http://example.com', tags: [] };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });

        render(<Popup />);
        await waitFor(() => expect(screen.getByPlaceholderText('Adicionar tags...')).toBeInTheDocument());

        const input = screen.getByPlaceholderText('Adicionar tags...');

        // Empty input + Enter
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        // Valid input + Other key
        fireEvent.change(input, { target: { value: 'tag' } });
        fireEvent.keyDown(input, { key: 'a', code: 'KeyA' });

        // Verify updateLink NOT called (except for initial check calls?)
        // Initial check calls getLink.
        // We want to check updateLink action.
        expect(browser.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({
            action: 'updateLink'
        }));
    });

    it('should handle undefined tags', async () => {
        const mockItem = {
            id: '1',
            title: 'Test',
            url: 'http://example.com',
            // tags undefined
        };
        (browser.tabs.query as jest.Mock).mockResolvedValue([{ url: 'http://example.com', id: 1 }]);
        (browser.runtime.sendMessage as jest.Mock).mockResolvedValue({ success: true, item: mockItem });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Link Salvo!')).toBeInTheDocument());
        // Verify tags is empty by checking no tags are rendered
        // .tag class is used for tags
        expect(screen.queryByText((content, element) => {
            return element?.classList.contains('tag');
        })).not.toBeInTheDocument();
    });
});
