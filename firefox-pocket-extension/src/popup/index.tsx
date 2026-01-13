import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem } from '../utils/types';
import './index.css';

const Popup = () => {
  const [saved, setSaved] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (currentTab && currentTab.url) {
      setCurrentUrl(currentTab.url);

      // Check if already saved
      const data = await browser.storage.local.get('savedItems');
      const savedItems = (data.savedItems as SavedItem[]) || [];
      const isSaved = savedItems.some(item => item.url === currentTab.url);

      if (isSaved) {
        setSaved(true);
        setLoading(false);
      } else {
        // Auto save on open? Pocket usually does this when you click the button.
        // Yes, let's save it.
        handleSave(currentTab);
      }
    } else {
      setLoading(false);
    }
  };

  const handleSave = async (tab: browser.Tabs.Tab) => {
    try {
        await browser.runtime.sendMessage({
            action: 'saveLink',
            payload: {
                url: tab.url,
                title: tab.title || tab.url,
            }
        });
        setSaved(true);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const openDashboard = () => {
    browser.tabs.create({ url: 'dashboard.html' });
  };

  const removePage = async () => {
      // Logic to remove... for now just close or show removed
      // We need to pass the URL to delete logic since we don't have the ID handy
      if (currentUrl) {
          await browser.runtime.sendMessage({
              action: 'deleteLink',
              payload: { url: currentUrl }
          });
      }
      window.close();
  };

  if (loading) {
      return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="header">
        <span>Pocket-like</span>
        <button className="link-btn" onClick={() => window.close()}>✕</button>
      </div>

      <div className="status-icon">
        {saved ? '✅' : '...'}
      </div>

      <div className="message">
        {saved ? 'Saved to Pocket-like!' : 'Saving...'}
      </div>

      <div className="sub-message">
        {new URL(currentUrl).hostname}
      </div>

      <div className="actions">
        <button className="btn" onClick={removePage}>Remove</button>
        <button className="btn btn-primary" onClick={openDashboard}>Open My List</button>
      </div>

      {/*
        Future: Add Tags input here
      */}
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
