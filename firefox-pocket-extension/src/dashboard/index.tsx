import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { SavedItem, ItemStatus } from '../utils/types';
import './index.css';

// Define filter types
type FilterType = 'home' | 'favorites' | 'archive';

const Dashboard = () => {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('home');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadItems();

    // Listen for updates from background
    browser.runtime.onMessage.addListener((msg: any) => {
      const message = msg as any;
      if (message.action === 'itemsUpdated') {
        loadItems();
      }
    });
  }, []);

  const loadItems = async () => {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getLinks' }) as { items: SavedItem[] };
      if (response && response.items) {
        setItems(response.items);
      }
    } catch (err) {
      console.error("Failed to load items", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this item?')) {
        await browser.runtime.sendMessage({ action: 'deleteLink', payload: { id } });
        loadItems();
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id, updates: { isFavorite: !isFavorite } }
      });
      loadItems();
  };

  const handleToggleArchive = async (e: React.MouseEvent, id: string, currentStatus: ItemStatus) => {
      e.preventDefault();
      e.stopPropagation();
      const newStatus = currentStatus === ItemStatus.Archived ? ItemStatus.Unread : ItemStatus.Archived;
      await browser.runtime.sendMessage({
          action: 'updateLink',
          payload: { id, updates: { status: newStatus } }
      });
      loadItems();
  };

  const filteredItems = items.filter(item => {
      if (activeFilter === 'home') {
          return item.status === ItemStatus.Unread;
      }
      if (activeFilter === 'favorites') {
          return item.isFavorite;
      }
      if (activeFilter === 'archive') {
          return item.status === ItemStatus.Archived;
      }
      return true;
  }).filter(item => {
      // Search
      return item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.url.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="logo">pocket-like</div>
        <div className={`nav-item ${activeFilter === 'home' ? 'active' : ''}`} onClick={() => setActiveFilter('home')}>Home</div>
        <div className={`nav-item ${activeFilter === 'favorites' ? 'active' : ''}`} onClick={() => setActiveFilter('favorites')}>Favorites</div>
        <div className={`nav-item ${activeFilter === 'archive' ? 'active' : ''}`} onClick={() => setActiveFilter('archive')}>Archive</div>
      </div>

      <div className="main-content">
        <div className="header">
            <h1 className="page-title">
                {activeFilter === 'home' && 'My List'}
                {activeFilter === 'favorites' && 'Favorites'}
                {activeFilter === 'archive' && 'Archive'}
            </h1>
            <input
                type="text"
                className="search-bar"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {filteredItems.length === 0 ? (
            <div className="empty-state">
                <h2>No items found</h2>
                <p>Save some links to get started!</p>
            </div>
        ) : (
            <div className="grid">
            {filteredItems.map(item => (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="card" key={item.id} style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="card-image" style={{backgroundImage: `url(${item.imageUrl || 'https://via.placeholder.com/300x160?text=No+Image'})`}}></div>
                <div className="card-content">
                    <div className="card-title">{item.title}</div>
                    <div className="card-meta">{new URL(item.url).hostname} • {item.estimatedReadTime} min</div>
                    <div className="card-actions">
                        <button
                            className="icon-btn"
                            title={item.isFavorite ? "Unfavorite" : "Favorite"}
                            onClick={(e) => handleToggleFavorite(e, item.id, item.isFavorite)}
                            style={{color: item.isFavorite ? 'orange' : ''}}
                        >
                            ★
                        </button>
                        <button
                            className="icon-btn"
                            title={item.status === ItemStatus.Archived ? "Unarchive" : "Archive"}
                            onClick={(e) => handleToggleArchive(e, item.id, item.status)}
                            style={{color: item.status === ItemStatus.Archived ? 'green' : ''}}
                        >
                            📥
                        </button>
                         <button
                            className="icon-btn"
                            title="Delete"
                            onClick={(e) => handleDelete(e, item.id)}
                        >
                            🗑️
                        </button>
                    </div>
                </div>
                </a>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
