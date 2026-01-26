import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import DOMPurify from 'dompurify';
import { SavedItem } from '../utils/types';
import { Modal } from '../components/Modal';
import { ReadingProgressBar } from '../components/ReadingProgressBar';
import { TTSPlayer } from '../components/TTSPlayer';
import { callGemini } from '../utils/aiService';
import './index.css';

const Reader = () => {
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    type?: 'default' | 'danger' | 'success';
    onConfirm?: () => void;
    confirmText?: string;
  }>({ isOpen: false, title: '', content: null });

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

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
      setModal({
        isOpen: true,
        title: 'Configuração Necessária',
        content: <p>Para usar o resumo com IA, você precisa configurar sua API Key do Gemini. Deseja ir para as configurações agora?</p>,
        type: 'default',
        onConfirm: () => {
          window.location.href = "dashboard.html";
        },
        confirmText: 'Ir para Configurações'
      });
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

      const aiText = await callGemini(apiKey, prompt, 'gemini-1.5-flash');

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

  // Prepare text for TTS
  const getPlainText = () => {
    if (!item.content) return "";
    const temp = document.createElement('div');
    temp.innerHTML = item.content;
    return temp.textContent || temp.innerText || "";
  };

  return (
    <div className="reader-container">
      <ReadingProgressBar />

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
        <div className="ai-summary">
          <h3>✨ Resumo Inteligente</h3>
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

      {item.content && <TTSPlayer text={getPlainText()} />}

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
        footer={
          modal.onConfirm ? (
            <>
              <button className="secondary-btn" onClick={closeModal} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button className="primary-btn" onClick={modal.onConfirm} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#ef4056', color: 'white', cursor: 'pointer' }}>{modal.confirmText}</button>
            </>
          ) : (
            <button className="primary-btn" onClick={closeModal} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#ef4056', color: 'white', cursor: 'pointer' }}>OK</button>
          )
        }
      >
        {modal.content}
      </Modal>
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
