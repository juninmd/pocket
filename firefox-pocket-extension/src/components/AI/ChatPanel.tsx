import React, { useState, useRef, useEffect } from 'react';
import { callGeminiChat, GeminiMessage } from '../../utils/aiService';
import DOMPurify from 'dompurify';

interface ChatPanelProps {
    apiKey: string;
    articleContent: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ apiKey, articleContent }) => {
    const [messages, setMessages] = useState<GeminiMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !apiKey || isLoading) return;

        const userMsg: GeminiMessage = { role: 'user', parts: [{ text: input }] };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Strip HTML for the prompt
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = articleContent;
            const cleanText = tempDiv.textContent || "";
            const truncatedText = cleanText.substring(0, 50000); // Safety limit

            const systemContext = `Você é um assistente útil e inteligente. Use o seguinte artigo como base para responder às perguntas do usuário. Responda em Português.\n\nArtigo:\n${truncatedText}`;

            // Merge context into the first message
            const historyToSend: GeminiMessage[] = newMessages.map((msg, index) => {
                if (index === 0) {
                     return {
                         role: 'user',
                         parts: [{ text: `${systemContext}\n\nPergunta do usuário: ${msg.parts[0].text}` }]
                     };
                }
                return msg;
            });

            const responseText = await callGeminiChat(apiKey, historyToSend);

            const modelMsg: GeminiMessage = { role: 'model', parts: [{ text: responseText }] };
            setMessages(prev => [...prev, modelMsg]);

        } catch (error: any) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Desculpe, ocorreu um erro ao processar sua mensagem." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestion = (text: string) => {
        setInput(text);
        // Optional: auto send
        // handleSend();
        // But setting state is async, so better let user click send or handle it via a dedicated function that takes text
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-panel">
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <p>💬 Olá! Eu li o artigo e estou pronto para responder suas perguntas.</p>
                        <div className="suggestions-list">
                            <button className="chat-suggestion" onClick={() => handleSuggestion("Quais são os pontos principais?")}>
                                Quais são os pontos principais?
                            </button>
                            <button className="chat-suggestion" onClick={() => handleSuggestion("Explique como se eu tivesse 5 anos")}>
                                Explique como se eu tivesse 5 anos
                            </button>
                            <button className="chat-suggestion" onClick={() => handleSuggestion("O que o autor conclui?")}>
                                O que o autor conclui?
                            </button>
                        </div>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className="message-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.parts[0].text.replace(/\n/g, '<br/>')) }} />
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message model loading-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Faça uma pergunta sobre o artigo..."
                    rows={1}
                />
                <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isLoading}>
                    ➤
                </button>
            </div>
        </div>
    );
};
