import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import DOMPurify from 'dompurify';
import { SavedItem } from '../utils/types';
import { getItem } from '../utils/storage';
import { Modal } from '../components/Modal';
import { ReadingProgressBar } from '../components/ReadingProgressBar';
import { TTSPlayer } from '../components/TTSPlayer';
import { callGemini } from '../utils/aiService';
import { ChatPanel } from '../components/AI/ChatPanel';
import { KeyConcepts } from '../components/AI/KeyConcepts';
import './index.css';

const Reader = () => {
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // AI Sidebar State
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'concepts'>('chat');

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

        const foundItem = await getItem(id);

        if (foundItem) {
          setItem(foundItem);
        } else {
          setError('Item não encontrado.');
        }

        const data = await browser.storage.local.get(['geminiApiKey']) as { geminiApiKey?: string };
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

  useEffect(() => {
      if (showSidebar) {
          document.body.classList.add('has-sidebar');
      } else {
          document.body.classList.remove('has-sidebar');
      }
      return () => {
          document.body.classList.remove('has-sidebar');
      };
  }, [showSidebar]);

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

  const toggleSidebar = () => {
      if (!apiKey) {
          setModal({
              isOpen: true,
              title: 'Recurso de IA',
              content: <p>Configure sua API Key nas opções para usar o chat inteligente e a extração de conceitos.</p>,
              onConfirm: () => window.location.href = "dashboard.html",
              confirmText: "Configurar"
          });
          return;
      }
      setShowSidebar(!showSidebar);
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!item) return <div className="error">Item não encontrado</div>;

  const getPlainText = () => {
    if (!item.content) return "";
    const temp = document.createElement('div');
    temp.innerHTML = item.content;
    return temp.textContent || temp.innerText || "";
  };

  return (
    <>
    <div className="reader-container">
      <ReadingProgressBar />

      <div className="header">
        <a href="dashboard.html" className="back-btn" aria-label="Voltar para Minha Lista">← Voltar para Minha Lista</a>
        <h1 className="article-title">{item.title}</h1>
        <div className="article-meta">
          {item.siteName ? <span>{item.siteName}</span> : <span>{new URL(item.url).hostname}</span>}
          {item.author && <span> • por {item.author}</span>}
          {item.estimatedReadTime && <span> • {item.estimatedReadTime} min de leitura</span>}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!summary && (
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="ai-btn"
              aria-label="Resumir artigo com IA"
            >
              {isSummarizing ? (
                <>Aguarde...</>
              ) : (
                <>✨ Resumir</>
              )}
            </button>
          )}
          <button className="ai-btn" onClick={toggleSidebar} aria-label="Alternar Chat e Conceitos">
              💬 Chat & Conceitos
          </button>

          {summarizeError && (
            <div style={{ color: 'red', marginTop: '10px', fontSize: '0.9rem', width: '100%' }}>
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

    {/* Floating Toggle Button */}
    <button className={`toggle-sidebar-btn ${showSidebar ? 'active' : ''}`} onClick={toggleSidebar} aria-label="Alternar barra lateral">
        {showSidebar ? '✕' : '💬'}
    </button>

    {/* AI Sidebar */}
    <aside className={`ai-sidebar ${showSidebar ? 'open' : ''}`}>
        <header className="sidebar-header">
            <div className="sidebar-title">
                <span>🤖</span> Assistente
            </div>
            <button className="sidebar-close" onClick={() => setShowSidebar(false)} aria-label="Fechar barra lateral">✕</button>
        </header>
        <div className="sidebar-tabs" role="tablist">
            <button
                className={`sidebar-tab ${sidebarTab === 'chat' ? 'active' : ''}`}
                onClick={() => setSidebarTab('chat')}
                role="tab"
                aria-selected={sidebarTab === 'chat'}
            >
                Chat
            </button>
            <button
                className={`sidebar-tab ${sidebarTab === 'concepts' ? 'active' : ''}`}
                onClick={() => setSidebarTab('concepts')}
                role="tab"
                aria-selected={sidebarTab === 'concepts'}
            >
                Conceitos
            </button>
        </div>
        <div className="sidebar-content" role="tabpanel">
            {apiKey && item?.content ? (
                <>
                    {sidebarTab === 'chat' && <ChatPanel apiKey={apiKey} articleContent={item.content} />}
                    {sidebarTab === 'concepts' && <KeyConcepts apiKey={apiKey} articleContent={item.content} />}
                </>
            ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                   {!apiKey ? "Configure a API Key para usar este recurso." : "Conteúdo não disponível para análise."}
                </div>
            )}
        </div>
    </aside>
    </>
  );
};

export default Reader;
