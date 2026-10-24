import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';
import Mascot from './Mascot';
import './index.css';

type PopupStatus = 'loading' | 'not_saved' | 'saving' | 'saved' | 'error';

const Popup = () => {
  const [status, setStatus] = useState<PopupStatus>('loading');
  const [item, setItem] = useState<SavedItem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [currentTab, setCurrentTab] = useState<browser.Tabs.Tab | null>(null);

  useEffect(() => {
    checkIfSaved();
  }, []);

  const checkIfSaved = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || !tab.url) {
        setStatus('error');
        return;
      }
      setCurrentTab(tab);

      // Check if already saved (but don't auto-save)
      const response = await browser.runtime.sendMessage({
        action: 'getLink',
        payload: { url: tab.url }
      }) as { success: boolean, item?: SavedItem };

      if (response && response.success && response.item) {
        setItem(response.item);
        setTags(response.item.tags || []);
        setStatus('saved');
      } else {
        // Not saved - show options
        setStatus('not_saved');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleSave = async () => {
    /* istanbul ignore next */
    if (!currentTab || !currentTab.url) return;
    setStatus('saving');

    let metadata = {};
    if (currentTab.id) {
      try {
        metadata = await browser.tabs.sendMessage(currentTab.id, { action: 'getMetadata' });
      } catch (err) {
        // Could not get metadata, falling back to basic info
      }
    }

    try {
      const saveResponse = await browser.runtime.sendMessage({
        action: 'saveLink',
        payload: {
          url: currentTab.url,
          title: currentTab.title || currentTab.url,
          ...metadata
        }
      }) as { success: boolean, item?: SavedItem };

      if (saveResponse && saveResponse.success && saveResponse.item) {
        setItem(saveResponse.item);
        setTags(saveResponse.item.tags || []);
        setStatus('saved');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && item) {
      const tag = tagInput.trim();
      setTagInput('');
      if (tags.includes(tag)) return;
      const newTags = [...tags, tag];
      setTags(newTags);
      await browser.runtime.sendMessage({
        action: 'updateLink',
        payload: { id: item.id, updates: { tags: newTags } }
      });
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    await browser.runtime.sendMessage({
      action: 'updateLink',
      payload: { id: item!.id, updates: { tags: newTags } }
    });
  };

  const handleArchive = async () => {
    /* istanbul ignore next */
    if (!item) return;
    await browser.runtime.sendMessage({
      action: 'updateLink',
      payload: { id: item!.id, updates: { status: ItemStatus.Archived } }
    });
    window.close();
  };

  const handleDelete = async () => {
    /* istanbul ignore next */
    if (!item) return;
    await browser.runtime.sendMessage({
      action: 'deleteLink',
      payload: { id: item!.id }
    });
    window.close();
  };

  const openDashboard = () => {
    browser.tabs.create({ url: 'dashboard.html' });
    window.close();
  };

  if (status === 'loading') {
    return <div className="loading" role="status">Carregando...</div>;
  }

  if (status === 'saving') {
    return <div className="loading" role="status">Salvando...</div>;
  }

  if (status === 'error') {
    return <div className="error" role="alert">Não foi possível acessar a página.</div>;
  }

  // Not saved - show options
  if (status === 'not_saved') {
    return (
      <div className="popup-container not-saved-view">
        <Mascot message="O que deseja fazer?" />
        <div className="not-saved-actions">
          <button className="primary-btn" onClick={handleSave}>
            💾 Salvar Esta Página
          </button>
          <button className="secondary-btn" onClick={openDashboard}>
            📂 Abrir Minha Lista
          </button>
        </div>
      </div>
    );
  }

  // Saved view
  return (
    <div className="popup-container">
      <Mascot message="Link Salvo!" />

      <div className="header">
        <div className="actions">
          <button type="button" onClick={handleArchive} title="Arquivar" aria-label="Arquivar">📥</button>
          <button type="button" onClick={handleDelete} title="Excluir" aria-label="Excluir">🗑️</button>
        </div>
      </div>

      {item && <div className="item-title">{item.title}</div>}

      <div className="tags-section">
        <div className="tags-list">
          {tags.map(tag => (
            <span key={tag} className="tag">
              {tag} <button type="button" aria-label={`Remover ${tag}`} onClick={() => removeTag(tag)}>×</button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Adicionar tags..."
          aria-label="Adicionar tags"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          className="tag-input"
        />
      </div>

      <div className="footer">
        <button className="link-btn" onClick={openDashboard}>Abrir Minha Lista</button>
      </div>
    </div>
  );
};

export default Popup;
