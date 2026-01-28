import React from 'react';
import ReactDOM from 'react-dom/client';
import Reader from './Reader';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Reader />
  </React.StrictMode>
);
