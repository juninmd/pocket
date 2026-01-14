import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Mascot from './Mascot';

import browser from 'webextension-polyfill';
import { SavedItem } from '../utils/types';
import './index.css';

const App = () => {
  const saveCurrentPage = () => {
    if (browser && browser.tabs) {
        browser.tabs.query({ active: true, currentWindow: true }).then((tabs: any) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url) {
            browser.runtime.sendMessage({
              action: 'saveLink',
              payload: {
                url: currentTab.url,
                title: currentTab.title || currentTab.url,
              }
            });
            window.close(); // Close the popup after sending the message
        }
        });
    }
  };

  const openDashboard = () => {
    browser.tabs.create({ url: 'dashboard.html' });
  };

  return (
    <div style={{width: '100%'}}>
      <div className="header">
        Pocket-like
        <div style={{fontSize: '12px', color: '#888'}}>Beta</div>
      </div>

      <div style={{display: 'flex', justifyContent: 'center'}}>
        <div className="status-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={saveCurrentPage}>Save Page</button>
        <button className="btn" onClick={openDashboard}>Open My List</button>
      </div>

      <Mascot />
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
