import React from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';

const App = () => {
  const saveCurrentPage = () => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        browser.runtime.sendMessage({
          action: 'saveLink',
          url: currentTab.url,
          title: currentTab.title || currentTab.url,
        });
        window.close(); // Close the popup after sending the message
      }
    });
  };

  return (
    <div>
      <h1>Pocket-like Extension</h1>
      <button onClick={saveCurrentPage}>Save Current Page</button>
      <p>More features coming soon!</p>
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
