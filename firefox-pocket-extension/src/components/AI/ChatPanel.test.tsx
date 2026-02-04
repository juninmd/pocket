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

    it('should handle all suggestion clicks', async () => {
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);
        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...') as HTMLTextAreaElement;

        fireEvent.click(screen.getByText('Quais são os pontos principais?'));
        expect(input.value).toBe('Quais são os pontos principais?');

        fireEvent.click(screen.getByText('Explique como se eu tivesse 5 anos'));
        expect(input.value).toBe('Explique como se eu tivesse 5 anos');

        fireEvent.click(screen.getByText('O que o autor conclui?'));
        expect(input.value).toBe('O que o autor conclui?');
    });

    it('should handle errors', async () => {
        (callGeminiChat as jest.Mock).mockRejectedValue(new Error('Fail'));
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Question?' } });
        fireEvent.click(screen.getByText('➤'));

        await waitFor(() => expect(screen.getByText('Desculpe, ocorreu um erro ao processar sua mensagem.')).toBeInTheDocument());
    });

    it('should inject context in first message', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('Response');
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'First Question' } });
        fireEvent.click(screen.getByText('➤'));

        await waitFor(() => expect(callGeminiChat).toHaveBeenCalled());

        const history = (callGeminiChat as jest.Mock).mock.calls[0][1];
        expect(history[0].parts[0].text).toContain('Você é um assistente útil');
        expect(history[0].parts[0].text).toContain('Article content');
        expect(history[0].parts[0].text).toContain('First Question');

        // Second message shouldn't have context injected again if we were to send another (though state reset handles it? No, history persists)
        // Actually, the component reconstructs history for EVERY call based on `messages` state?
        // Let's check code:
        // const historyToSend: GeminiMessage[] = newMessages.map((msg, index) => { if (index === 0) ... });
        // Yes, it reconstructs it.
    });

    it('should submit on enter', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('Response');
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Enter Question' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        await waitFor(() => expect(screen.getByText('Response')).toBeInTheDocument());
    });

    it('should not submit on Shift+Enter', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('Response');
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Enter Question' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true });

        expect(callGeminiChat).not.toHaveBeenCalled();
    });

    it('should handle multiple messages history', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('Response 1');
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        // Msg 1
        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Q1' } });
        fireEvent.click(screen.getByText('➤'));
        await waitFor(() => expect(screen.getByText('Response 1')).toBeInTheDocument());

        // Msg 2
        (callGeminiChat as jest.Mock).mockResolvedValue('Response 2');
        fireEvent.change(input, { target: { value: 'Q2' } });
        fireEvent.click(screen.getByText('➤'));
        await waitFor(() => expect(screen.getByText('Response 2')).toBeInTheDocument());

        // Check history sent for second call
        const history2 = (callGeminiChat as jest.Mock).mock.calls[1][1];
        expect(history2.length).toBe(3); // Q1, R1, Q2
        // First message should still have context
        expect(history2[0].parts[0].text).toContain('Article content');
        // Third message (Q2) should be just text
        expect(history2[2].parts[0].text).toBe('Q2');
        // NOT contain context
        expect(history2[2].parts[0].text).not.toContain('Article content');
    });

    it('should not submit on other keys', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('Response');
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Typing' } });
        fireEvent.keyDown(input, { key: 'a', code: 'KeyA' });

        expect(callGeminiChat).not.toHaveBeenCalled();
    });

    it('should not send if input empty', async () => {
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);
        fireEvent.click(screen.getByText('➤'));
        expect(callGeminiChat).not.toHaveBeenCalled();
    });

    it('should not send if loading', async () => {
        // Make it hang
        (callGeminiChat as jest.Mock).mockReturnValue(new Promise(() => {}));
        render(<ChatPanel apiKey={apiKey} articleContent={content} />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'First' } });
        fireEvent.click(screen.getByText('➤'));

        expect(callGeminiChat).toHaveBeenCalledTimes(1);

        // Try second send while loading
        fireEvent.change(input, { target: { value: 'Second' } });
        fireEvent.click(screen.getByText('➤')); // Button is disabled actually?

        // Check if button disabled
        expect(screen.getByText('➤')).toBeDisabled();

        // Even if we force click or keydown
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
        expect(callGeminiChat).toHaveBeenCalledTimes(1);
    });

    it('should handle empty content and messages', async () => {
        (callGeminiChat as jest.Mock).mockResolvedValue('');

        const { container } = render(<ChatPanel apiKey={apiKey} articleContent="" />);

        const input = screen.getByPlaceholderText('Faça uma pergunta sobre o artigo...');
        fireEvent.change(input, { target: { value: 'Q' } });
        fireEvent.click(screen.getByText('➤'));

        await waitFor(() => expect(callGeminiChat).toHaveBeenCalled());

        const messages = container.getElementsByClassName('chat-message');
        expect(messages.length).toBeGreaterThan(0);

        expect(screen.getByText('Q')).toBeInTheDocument();

        const modelMessages = container.getElementsByClassName('model');
        expect(modelMessages.length).toBeGreaterThan(0);
    });
});
