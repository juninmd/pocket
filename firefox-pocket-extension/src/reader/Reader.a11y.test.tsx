import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Reader from './Reader';
import browser from 'webextension-polyfill';
import { getItem } from '../utils/storage';

jest.mock('webextension-polyfill');
jest.mock('../utils/aiService');
jest.mock('../utils/storage');
jest.mock('../components/ReadingProgressBar', () => ({ ReadingProgressBar: () => <div>ProgressBar</div> }));
jest.mock('../components/TTSPlayer', () => ({ TTSPlayer: () => <div>TTSPlayer</div> }));
jest.mock('../components/AI/ChatPanel', () => ({ ChatPanel: () => <div>ChatPanel</div> }));
jest.mock('../components/AI/KeyConcepts', () => ({ KeyConcepts: () => <div>KeyConcepts</div> }));

describe('Reader Accessibility', () => {
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

    it('should render buttons with aria-labels', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);

        render(<Reader />);

        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        expect(screen.getByLabelText('Voltar para Minha Lista')).toBeInTheDocument();
        expect(screen.getByLabelText('Resumir artigo com IA')).toBeInTheDocument();
        expect(screen.getByLabelText('Alternar Chat e Conceitos')).toBeInTheDocument();
        expect(screen.getByLabelText('Alternar barra lateral')).toBeInTheDocument();
    });

    it('should render sidebar with correct roles and structure', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);
        (browser.storage.local.get as jest.Mock).mockResolvedValue({ geminiApiKey: 'key' });

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        // Open sidebar
        fireEvent.click(screen.getByLabelText('Alternar barra lateral'));

        // Check for semantic tag aside (complementary role)
        const sidebar = screen.getByRole('complementary');
        expect(sidebar).toBeInTheDocument();
        expect(sidebar).toHaveClass('ai-sidebar');

        // Check for tablist
        const tabList = screen.getByRole('tablist');
        expect(tabList).toBeInTheDocument();

        // Check tabs
        const chatTab = screen.getByRole('tab', { name: /Chat/i });
        const conceptsTab = screen.getByRole('tab', { name: /Conceitos/i });

        expect(chatTab).toBeInTheDocument();
        expect(conceptsTab).toBeInTheDocument();

        // Check selected state
        expect(chatTab).toHaveAttribute('aria-selected', 'true');
        expect(conceptsTab).toHaveAttribute('aria-selected', 'false');

        // Switch tab
        fireEvent.click(conceptsTab);
        expect(chatTab).toHaveAttribute('aria-selected', 'false');
        expect(conceptsTab).toHaveAttribute('aria-selected', 'true');

        // Check close button
        expect(screen.getByLabelText('Fechar barra lateral')).toBeInTheDocument();
    });

    it('should render modal with correct accessibility attributes', async () => {
        (getItem as jest.Mock).mockResolvedValue(mockItem);
        // Ensure no API key so modal opens on action
        (browser.storage.local.get as jest.Mock).mockResolvedValue({});

        render(<Reader />);
        await waitFor(() => expect(screen.getByText('Test Article')).toBeInTheDocument());

        // Trigger modal
        fireEvent.click(screen.getByLabelText('Resumir artigo com IA'));

        const modal = await screen.findByRole('dialog');
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

        const title = document.getElementById('modal-title');
        expect(title).toBeInTheDocument();
        expect(title).toHaveTextContent('Configuração Necessária');

        expect(screen.getByLabelText('Fechar')).toBeInTheDocument();
    });
});
