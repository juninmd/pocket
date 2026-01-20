import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem } from '../utils/types';
import './index.css';

const Reader = () => {
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (!id) {
          setError('Nenhum item especificado.');
          setLoading(false);
          return;
        }

        // Get all items and find the one with matching ID
        // Note: storage.get('savedItems') is efficient enough for this
        const data = await browser.storage.local.get('savedItems');
        const items = (data.savedItems as SavedItem[]) || [];
        const foundItem = items.find(i => i.id === id);

        if (foundItem) {
          setItem(foundItem);
        } else {
          setError('Item não encontrado.');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar o item.');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, []);

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
      </div>

      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.title} className="article-image" />
      )}

      <div className="content">
        {item.content ? (
           <div dangerouslySetInnerHTML={{ __html: item.content }} />
        ) : (
           <div>
               <p>{item.excerpt}</p>
               <p style={{fontStyle: 'italic', marginTop: '30px'}}>
                   Conteúdo completo não disponível para leitura offline.
                   <a href={item.url} target="_blank" rel="noopener noreferrer" style={{color: '#ef4056'}}>Ler original</a>
               </p>
           </div>
        )}
      </div>

      {!item.content && (
         <div style={{textAlign: 'center', marginTop: '50px'}}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="back-btn" style={{fontSize: '18px', border: '1px solid #ef4056', padding: '10px 20px', borderRadius: '4px'}}>
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
