import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom'; // Import HashRouter
import MainApp from './components/MainApp'; // Main App
import { Web3Provider } from './contexts/Web3Context'; // Import Web3Context

ReactDOM.render(
  <React.StrictMode>
    <Web3Provider>
      <HashRouter>
        <MainApp />
      </HashRouter>
    </Web3Provider>
  </React.StrictMode>,
  document.getElementById('root')
);
