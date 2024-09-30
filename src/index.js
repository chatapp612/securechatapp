import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom'; // Import HashRouter
import MainApp from './components/MainApp.js';

ReactDOM.render(
  <React.StrictMode>
    <HashRouter> {/* Wrap your app in HashRouter */}
      <MainApp />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
