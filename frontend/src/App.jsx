import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PlanlyPage from './pages/PlanlyPage';
import ContestsExamsPage from './pages/ContestsExamsPage';
import LeetCodeSyncPage from './pages/LeetCodeSyncPage';
import WhiteboardPage from './pages/WhiteboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/planly" element={<PlanlyPage />} />
          <Route path="/contests" element={<ContestsExamsPage />} />
          <Route path="/leetcode" element={<LeetCodeSyncPage />} />
          <Route path="/whiteboard" element={<WhiteboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
