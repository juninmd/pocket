import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Reader from './Reader';
import browser from 'webextension-polyfill';
import { callGemini } from '../utils/aiService';
import { getItem } from '../utils/storage';

jest.mock('webextension-polyfill');
jest.mock('../utils/aiService');
jest.mock('../utils/storage');
jest.mock('../components/ReadingProgressBar', () => ({ ReadingProgressBar: () => <div>ProgressBar</div> }));
jest.mock('../components/TTSPlayer', () => ({ TTSPlayer: () => <div>TTSPlayer</div> }));
jest.mock('../components/AI/ChatPanel', () => ({ ChatPanel: () => <div>ChatPanel</div> }));
jest.mock('../components/AI/KeyConcepts', () => ({ KeyConcepts: () => <div>KeyConcepts</div> }));

describe('Reader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock URL search params
        Object.defineProperty(window, 'location', {
            value: {
                search: '?id=1',
                href: 'reader.html?id=1',
                origin: 'http://localhost'
            },
            writable: true
        });

        // Default mocks
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});
    });

    const mockItem = {
        id: '1',
        title: 'Test Article',
        url: 'http://example.com',
        content: '<p>Content</p>',
        excerpt: 'Excerpt',
        siteName: 'Example',
        author: 'Author',
        estimatedReadTime: 5
    };

    it('should render item content', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);

        render(<Reader />);

        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('ProgressBar')).toBeInTheDocument();
        expect(getItem).toHaveBeenCalledWith('1');
    });

    it('should show error if item not found', async () => {
        (getItem as jest.Mock).mockResolvedValue(null);

        render(<Reader />);

        await waitFor(() => expect(screen.getByText('Item não encontrado.')).toBeInTheDocument());
    });

    it('should show error if no id', async () => {
        Object.defineProperty(window, 'location', {
            value: {
                search: '',
                href: 'reader.html',
                origin: 'http://localhost'
            },
            writable: true
        });

        render(<Reader />);

        await waitFor(() => expect(screen.getByText('Nenhum item especificado.')).toBeInTheDocument());
    });

    it('should handle summarization', async () => {
         (getItem as jest.Mock).mockResolvedValue(mockItem);
         (browser.storage.local.get as jest.Mock).mockResolvedValue({
             geminiApiKey: 'key'
         });
         (callGemini as jest.Mock).mockResolvedValue('Summary Text');

         render(<Reader />);
         await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

         fireEvent.click(screen.getByText('✨ Resumir'));

         expect(screen.getByText('Aguarde...')).toBeInTheDocument();
         await waitFor(() => expect(screen.getByText('Summary Text')).toBeInTheDocument());
    });

    it('should show config modal if no api key for summarize', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
             // no key
         });

         render(<Reader />);
         await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

         fireEvent.click(screen.getByText('✨ Resumir'));

         expect(screen.getByText('Configuração Necessária')).toBeInTheDocument();
    });

    it('should handle sidebar toggle and tabs', async () => {
         (getItem as jest.Mock).mockResolvedValue(mockItem);
         (browser.storage.local.get as jest.Mock).mockResolvedValue({
             geminiApiKey: 'key'
         });

         render(<Reader />);
         await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

         const toggleBtn = screen.getByText('💬');
         fireEvent.click(toggleBtn);

         expect(screen.getByText('Assistente')).toBeInTheDocument();

         // Toggle concepts
         fireEvent.click(screen.getByText('Conceitos'));
         expect(screen.getByText('KeyConcepts')).toBeInTheDocument();

         // Toggle back to chat
         fireEvent.click(screen.getByText('Chat'));
         expect(screen.getByText('ChatPanel')).toBeInTheDocument();

         // Close
         fireEvent.click(screen.getAllByText('✕')[0]);
    });

    it('should toggle sidebar using floating button', async () => {
         (getItem as jest.Mock).mockResolvedValue(mockItem);
         (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });

         render(<Reader />);
         await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

         const floatingBtn = screen.getByLabelText('Alternar barra lateral');
         fireEvent.click(floatingBtn);

         expect(document.body.classList.contains('has-sidebar')).toBe(true);

         // Click again to close
         fireEvent.click(floatingBtn);
         expect(document.body.classList.contains('has-sidebar')).toBe(false);
    });

    it('should close sidebar using close button in sidebar header', async () => {
         (getItem as jest.Mock).mockResolvedValue(mockItem);
         (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });

         render(<Reader />);
         await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

         // Open sidebar
         fireEvent.click(screen.getByText('💬 Chat & Conceitos'));
         expect(document.body.classList.contains('has-sidebar')).toBe(true);

         // Close using header button
         const closeBtn = screen.getByLabelText('Fechar barra lateral');
         fireEvent.click(closeBtn);

         expect(document.body.classList.contains('has-sidebar')).toBe(false);
    });

    it('should handle load data error', async () => {
        (getItem as jest.Mock).mockRejectedValue(new Error('Storage Fail'));
        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Erro ao carregar o item.')).toBeInTheDocument());
    });

    it('should cleanup sidebar class on unmount', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });

        const { unmount } = render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💬'));
        expect(document.body.classList.contains('has-sidebar')).toBe(true);

        unmount();
        expect(document.body.classList.contains('has-sidebar')).toBe(false);
    });

    it('should handle summarize error', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });
        (callGemini as jest.Mock).mockRejectedValue(new Error('AI Fail'));

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        fireEvent.click(screen.getByText('✨ Resumir'));
        await waitFor(() => expect(screen.getByText('Erro ao gerar resumo: AI Fail')).toBeInTheDocument());
    });

    it('should handle empty summary response', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });
        (callGemini as jest.Mock).mockResolvedValue(''); // Empty response

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        fireEvent.click(screen.getByText('✨ Resumir'));
        await waitFor(() => expect(screen.getByText('Erro ao gerar resumo: Nenhuma resposta gerada.')).toBeInTheDocument());
    });

    it('should redirect to settings if no key for summarize', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);

        const hrefSpy = jest.fn();
        Object.defineProperty(window, 'location', {
            value: {
                search: '?id=1',
                origin: 'http://localhost',
                set href(val: string) { hrefSpy(val); },
                get href() { return 'reader.html?id=1'; }
            },
            writable: true
        });

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        fireEvent.click(screen.getByText('✨ Resumir'));
        expect(screen.getByText('Configuração Necessária')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Ir para Configurações'));
        expect(hrefSpy).toHaveBeenCalledWith('dashboard.html');
    });

    it('should redirect to settings if no key for sidebar', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);

        const hrefSpy = jest.fn();
        Object.defineProperty(window, 'location', {
            value: {
                search: '?id=1',
                origin: 'http://localhost',
                set href(val: string) { hrefSpy(val); },
                get href() { return 'reader.html?id=1'; }
            },
            writable: true
        });

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        fireEvent.click(screen.getByText('💬'));
        expect(screen.getByText('Recurso de IA')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Configurar'));
        expect(hrefSpy).toHaveBeenCalledWith('dashboard.html');
    });

    it('should close modal', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        // Trigger modal (e.g. summarize without key)
        fireEvent.click(screen.getByText('✨ Resumir'));
        expect(screen.getByText('Configuração Necessária')).toBeInTheDocument();

        // Click Cancelar
        fireEvent.click(screen.getByText('Cancelar'));
        await waitFor(() => expect(screen.queryByText('Configuração Necessária')).not.toBeInTheDocument());
    });

    it('should show error if summarizing item with no content', async () => {
        const itemNoContent = { ...mockItem, content: '' };
        (getItem as jest.Mock).mockResolvedValue(itemNoContent);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        fireEvent.click(screen.getByText('✨ Resumir'));

        expect(screen.getByText('Não há conteúdo textual suficiente para resumir.')).toBeInTheDocument();
    });
});
