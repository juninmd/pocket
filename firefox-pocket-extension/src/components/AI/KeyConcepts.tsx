import React, { useState } from 'react';
import { callGemini } from '../../utils/aiService';

interface Concept {
    term: string;
    definition: string;
}

interface KeyConceptsProps {
    apiKey: string;
    articleContent: string;
}

export const KeyConcepts: React.FC<KeyConceptsProps> = ({ apiKey, articleContent }) => {
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadConcepts = async () => {
        if (loading || hasLoaded) return;
        setLoading(true);
        setError(null);

        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = articleContent;
            const cleanText = tempDiv.textContent || "";
            const truncatedText = cleanText.substring(0, 30000);

            const prompt = `Analise o texto abaixo e identifique 5 conceitos-chave, termos técnicos ou ideias complexas.
            Retorne APENAS um array JSON válido onde cada objeto tem:
            - "term": o nome do conceito
            - "definition": uma explicação clara e concisa (máximo 2 frases) em Português.

            Texto: ${truncatedText}`;

            const jsonText = await callGemini(apiKey, prompt, 'gemini-1.5-flash', { jsonMode: true });

            let data = [];
            try {
                const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
                data = JSON.parse(cleanJson);

                // Handle { "concepts": [...] } wrapping often returned by Gemini even if asked for array
                if (!Array.isArray(data)) {
                     // @ts-ignore
                     if (data.concepts) data = data.concepts;
                     // @ts-ignore
                     else if (data.items) data = data.items;
                }
            } catch (e) {
                console.error("JSON Parse error", e);
                throw new Error("Falha ao processar resposta da IA.");
            }

            if (Array.isArray(data)) {
                setConcepts(data);
                setHasLoaded(true);
            } else {
                throw new Error("Formato de resposta inválido.");
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!hasLoaded && !loading && !error) {
        return (
            <div className="concepts-start">
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Identifique termos técnicos e ideias principais automaticamente.
                </p>
                <button className="ai-btn" onClick={loadConcepts}>
                    🧠 Extrair Conceitos-Chave
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-concepts" style={{ textAlign: 'center', padding: '20px' }}>
                <p>Analisando o texto...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-concepts" style={{ color: 'var(--accent)' }}>
                <p>{error}</p>
                <button onClick={() => { setLoading(false); loadConcepts(); }} className="secondary-btn">Tentar Novamente</button>
            </div>
        );
    }

    return (
        <div className="concepts-list">
            {concepts.map((c, idx) => (
                <div key={idx} className="concept-card">
                    <div className="concept-term">{c.term}</div>
                    <div className="concept-def">{c.definition}</div>
                </div>
            ))}
        </div>
    );
};
