import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Reader from './Reader';
import browser from 'webextension-polyfill';
import { callGemini } from '../utils/aiService';

jest.mock('webextension-polyfill');
jest.mock('../utils/aiService');
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
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [mockItem] });

        render(<Reader />);

        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('ProgressBar')).toBeInTheDocument();
    });

    it('should show error if item not found', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ savedItems: [] });

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
         (browser.storage.local.get as jest.Mock).mockResolvedValue({
             savedItems: [mockItem],
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
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
             savedItems: [mockItem]
             // no key
         });

         render(<Reader />);
         await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

         fireEvent.click(screen.getByText('✨ Resumir'));

         expect(screen.getByText('Configuração Necessária')).toBeInTheDocument();
    });

    it('should handle sidebar toggle', async () => {
        (browser.storage.local.get as jest.Mock).mockResolvedValue({
             savedItems: [mockItem],
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

         // Close
         fireEvent.click(screen.getAllByText('✕')[0]);
         // Checking class or state might be hard, but we can check if sidebar is visible via class if we could
    });
});
