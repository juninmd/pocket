import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import DOMPurify from 'dompurify';
import { SavedItem } from '../utils/types';
import './index.css';

const Reader = () => {
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (!id) {
          setError('Nenhum item especificado.');
          setLoading(false);
          return;
        }

        const data = await browser.storage.local.get(['savedItems', 'geminiApiKey']) as { savedItems?: SavedItem[], geminiApiKey?: string };
        const items = (data.savedItems as SavedItem[]) || [];
        const foundItem = items.find(i => i.id === id);

        if (foundItem) {
          setItem(foundItem);
        } else {
          setError('Item não encontrado.');
        }

        if (data.geminiApiKey) {
          setApiKey(data.geminiApiKey);
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar o item.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSummarize = async () => {
    if (!apiKey) {
      if (confirm("Para usar o resumo com IA, você precisa configurar sua API Key do Gemini. Deseja ir para as configurações agora?")) {
        window.location.href = "dashboard.html";
      }
      return;
    }

    if (!item?.content) {
      setSummarizeError("Não há conteúdo textual suficiente para resumir.");
      return;
    }

    setIsSummarizing(true);
    setSummarizeError(null);
    try {
      // Strip HTML for the prompt to save tokens (basic stripping)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = item.content;
      const plainText = tempDiv.textContent || "";
      const truncatedText = plainText.substring(0, 30000); // Safety limit

      const prompt = `Resuma o seguinte artigo em 3 pontos principais (bullet points) e um breve parágrafo de conclusão. Responda em Português do Brasil.\n\nArtigo:\n${truncatedText}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Erro na API");
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        setSummary(aiText);
      } else {
        throw new Error("Nenhuma resposta gerada.");
      }

    } catch (e: any) {
      console.error("Erro ao resumir", e);
      setSummarizeError(`Erro ao gerar resumo: ${e.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!item) return <div className="error">Item não encontrado</div>;

  return (
    <div className="reader-container">
      <div className="header">
        <a href="dashboard.html" className="back-btn">← Voltar para Minha Lista</a>
        <h1 className="article-title">{item.title}</h1>
        <div className="article-meta">
          {item.siteName ? <span>{item.siteName}</span> : <span>{new URL(item.url).hostname}</span>}
          {item.author && <span> • por {item.author}</span>}
          {item.estimatedReadTime && <span> • {item.estimatedReadTime} min de leitura</span>}
        </div>

        <div style={{ marginTop: '20px' }}>
          {!summary && (
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="ai-btn"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: isSummarizing ? 'wait' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
            >
              {isSummarizing ? (
                <>Aguarde...</>
              ) : (
                <>✨ Resumir com IA</>
              )}
            </button>
          )}
          {summarizeError && (
             <div style={{ color: 'red', marginTop: '10px', fontSize: '0.9rem' }}>
                {summarizeError}
             </div>
          )}
        </div>
      </div>

      {summary && (
        <div className="summary-box" style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px',
          borderLeft: '4px solid #764ba2'
        }}>
          <h3 style={{ marginTop: 0, color: '#764ba2' }}>Resumo Inteligente</h3>
          <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(summary.replace(/\n/g, '<br/>')) }} />
        </div>
      )}

      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.title} className="article-image" />
      )}

      <div className="content">
        {item.content ? (
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content) }} />
        ) : (
          <div>
            <p>{item.excerpt}</p>
            <p style={{ fontStyle: 'italic', marginTop: '30px' }}>
              Conteúdo completo não disponível para leitura offline.
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#ef4056' }}>Ler original</a>
            </p>
          </div>
        )}
      </div>

      {!item.content && (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="back-btn" style={{ fontSize: '18px', border: '1px solid #ef4056', padding: '10px 20px', borderRadius: '4px' }}>
            Ler artigo original
          </a>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Reader />
  </React.StrictMode>
);
