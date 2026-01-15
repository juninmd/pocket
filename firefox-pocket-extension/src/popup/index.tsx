import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';
import './index.css';

const App = () => {
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [item, setItem] = useState<SavedItem | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    checkAndSave();
  }, []);

  const checkAndSave = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.url) {
         setStatus('error');
         return;
      }

      // Check if already saved
      const response = await browser.runtime.sendMessage({
        action: 'getLink',
        payload: { url: currentTab.url }
      }) as { success: boolean, item?: SavedItem };

      if (response && response.success && response.item) {
        setItem(response.item);
        setTags(response.item.tags || []);
        setStatus('saved');
      } else {
        // Not saved, save it
        setStatus('saving');
        const saveResponse = await browser.runtime.sendMessage({
          action: 'saveLink',
          payload: {
            url: currentTab.url,
            title: currentTab.title || currentTab.url,
          }
        }) as { success: boolean, item?: SavedItem };
        if (saveResponse && saveResponse.success && saveResponse.item) {
            setItem(saveResponse.item);
            setTags(saveResponse.item.tags || []);
            setStatus('saved');
        } else {
            setStatus('error');
        }
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && item) {
       const newTags = [...tags, tagInput.trim()];
       setTags(newTags);
       setTagInput('');
       // Update in backend
       await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id: item.id, updates: { tags: newTags } }
       });
    }
  };

  const removeTag = async (tagToRemove: string) => {
      if (!item) return;
      const newTags = tags.filter(t => t !== tagToRemove);
      setTags(newTags);
      await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id: item.id, updates: { tags: newTags } }
       });
  }

  const handleArchive = async () => {
      if (!item) return;
      await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id: item.id, updates: { status: ItemStatus.Archived } }
      });
      window.close();
  };

  const handleDelete = async () => {
      if (!item) return;
       await browser.runtime.sendMessage({
          action: 'deleteLink',
          payload: { id: item.id }
      });
      window.close();
  };

  const openDashboard = () => {
    browser.tabs.create({ url: 'dashboard.html' });
  };

  if (status === 'loading' || status === 'saving') {
      return <div className="loading">Saving...</div>;
  }

  if (status === 'error') {
      return <div className="error">Could not save page.</div>;
  }

  return (
    <div className="popup-container">
      <div className="header">
        <div className="success-message">
            <span className="check-icon">✓</span> Saved
        </div>
        <div className="actions">
             <button onClick={handleArchive} title="Archive">📥</button>
             <button onClick={handleDelete} title="Delete">🗑️</button>
        </div>
      </div>

      {item && <div className="item-title">{item.title}</div>}

      <div className="tags-section">
        <div className="tags-list">
            {tags.map(tag => (
                <span key={tag} className="tag">
                    {tag} <button onClick={() => removeTag(tag)}>×</button>
                </span>
            ))}
        </div>
        <input
            type="text"
            placeholder="Add Tags..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="tag-input"
        />
      </div>

      <div className="footer">
         <button className="link-btn" onClick={openDashboard}>Open My List</button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
