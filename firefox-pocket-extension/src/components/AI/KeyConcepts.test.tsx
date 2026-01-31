import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeyConcepts } from './KeyConcepts';
import { callGemini } from '../../utils/aiService';

jest.mock('../../utils/aiService');

describe('KeyConcepts', () => {
    const apiKey = 'test-key';
    const content = 'Article content';

    it('should render start button', () => {
        render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
        expect(screen.getByText('🧠 Extrair Conceitos-Chave')).toBeInTheDocument();
    });

    it('should load and display concepts', async () => {
        const mockResponse = JSON.stringify([
            { term: 'Term 1', definition: 'Def 1' }
        ]);
        (callGemini as jest.Mock).mockResolvedValue(mockResponse);

        render(<KeyConcepts apiKey={apiKey} articleContent={content} />);

        fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

        expect(screen.getByText('Analisando o texto...')).toBeInTheDocument();

        await waitFor(() => expect(screen.getByText('Term 1')).toBeInTheDocument());
        expect(screen.getByText('Def 1')).toBeInTheDocument();
    });

    it('should handle parsing wrapped JSON', async () => {
         const mockResponse = JSON.stringify({
             concepts: [{ term: 'Term 1', definition: 'Def 1' }]
         });
         (callGemini as jest.Mock).mockResolvedValue(mockResponse);

         render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
         fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

         await waitFor(() => expect(screen.getByText('Term 1')).toBeInTheDocument());
    });

    it('should handle errors', async () => {
        (callGemini as jest.Mock).mockImplementation(() => Promise.reject(new Error('Fail')));

        render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
        fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

        // Wait for error state. Text might be inside <p>
        await waitFor(() => {
            const errorMsg = screen.queryByText(/Fail/i);
            expect(errorMsg).toBeInTheDocument();
        });
    });

    it('should handle items wrapper in JSON', async () => {
         const mockResponse = JSON.stringify({
             items: [{ term: 'Term 1', definition: 'Def 1' }]
         });
         (callGemini as jest.Mock).mockResolvedValue(mockResponse);

         render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
         fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

         await waitFor(() => expect(screen.getByText('Term 1')).toBeInTheDocument());
    });

    it('should handle invalid JSON format', async () => {
         (callGemini as jest.Mock).mockResolvedValue('invalid json');

         render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
         fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

         await waitFor(() => expect(screen.getByText('Falha ao processar resposta da IA.')).toBeInTheDocument());
    });

    it('should handle invalid response structure', async () => {
         (callGemini as jest.Mock).mockResolvedValue('{"other": []}'); // Valid JSON but not array

         render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
         fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

         await waitFor(() => expect(screen.getByText('Formato de resposta inválido.')).toBeInTheDocument());
    });

    it('should retry on error', async () => {
        (callGemini as jest.Mock).mockRejectedValueOnce(new Error('Fail'));
        (callGemini as jest.Mock).mockResolvedValueOnce(JSON.stringify([{ term: 'Term 1', definition: 'Def 1' }]));

        render(<KeyConcepts apiKey={apiKey} articleContent={content} />);
        fireEvent.click(screen.getByText('🧠 Extrair Conceitos-Chave'));

        // Wait for error
        await waitFor(() => expect(screen.getByText('Fail')).toBeInTheDocument());

        // Retry
        fireEvent.click(screen.getByText('Tentar Novamente'));

        await waitFor(() => expect(screen.getByText('Term 1')).toBeInTheDocument());
    });
});
