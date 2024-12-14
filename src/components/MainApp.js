import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';

import Home from './Home'; 
const MainApp = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={<App />} />
            
        </Routes>
    );
};

export default MainApp;
