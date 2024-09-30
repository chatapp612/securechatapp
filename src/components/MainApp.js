// MainApp.js
import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Remove HashRouter import
import App from './App'; // Your main component
import AddContactPage from './AddContactPage'; // Assuming you have an AddContactPage component

const MainApp = () => {
    return (
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/add-contact" element={<AddContactPage />} />
        </Routes>
    );
};

export default MainApp;
