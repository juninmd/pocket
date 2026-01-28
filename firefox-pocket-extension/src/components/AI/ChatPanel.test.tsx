import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';
import { callGeminiChat } from '../../utils/aiService';

jest.mock('../../utils/aiService');
jest.mock('dompurify', () => ({
    sanitize: (str: string) => str
}));

describe('ChatPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock scrollIntoView
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    const apiKey = 'test-key';
    const content = 'Article content';

    it('should render empty state initially', () => {
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);
        expect(screen.getByText('💬 Olá! Eu li o artigo e estou pronto para responder suas perguntas.')).toBeInTheDocument();
    });

    it('should send message and display response', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('Response from AI');
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Question?' } });

        const sendBtn = screen.getByText('➤');
        fireEvent.click(sendBtn);

        expect(screen.getByText('Question?')).toBeInTheDocument(); // User msg
        // Wait for response
        await waitFor(() => expect(screen.getByText('Response from AI')).toBeInTheDocument());
    });

    it('should handle suggestion clicks', async () => {
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const suggestion = screen.getByText('Quais são os pontos principais?');
        fireEvent.click(suggestion);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...') as HTMLTextAreaElement;
        expect(input.value).toBe('Quais são os pontos principais?');
    });

    it('should handle errors', async () => {
        (callGeminiChat as jest.Mock).mockRejectedValue(new Error('Fail'));
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Question?' } });
        fireEvent.click(screen.getByText('➤'));

        await waitFor(() => expect(screen.getByText('Desculpe, ocorreu um erro ao processar sua mensagem.')).toBeInTheDocument());
    });
});
