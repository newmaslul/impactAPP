import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

// HashRouter (not BrowserRouter) because this deploys to GitHub Pages,
// which serves static files with no server-side rewrite for client routes —
// hash-based URLs (e.g. /#/app/home) work there without extra 404 tricks.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
