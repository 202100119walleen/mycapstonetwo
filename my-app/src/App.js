// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignInPage from './components/SignInPage';
import CreateAccountPage from './components/CreateAccountPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import DashboardPage from './components/DashboardPage';
import ManageItem from './pages/ManageItem';
import ApproveRequest from './pages/ApproveRequest';

import Reports from './pages/Reports';
import Scanner from './pages/Scanner';  
import Settings from './pages/Settings';
import Layout from './layout/Layout'; // Import the Layout

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Routes wrapped with Layout to include the sidebar */}
        <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/manage-item" element={<Layout><ManageItem /></Layout>} />
        <Route path="/approve-request" element={<Layout><ApproveRequest /></Layout>}  />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        <Route path="/scanner" element={<Layout><Scanner /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/sign-in" element={<SignInPage />} />
        
    
      </Routes>
    </Router>
  );
};

export default App;
