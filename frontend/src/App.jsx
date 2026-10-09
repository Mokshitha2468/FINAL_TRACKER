import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PlanlyPage from './pages/PlanlyPage';
import ContestsExamsPage from './pages/ContestsExamsPage';
import LeetCodeSyncPage from './pages/LeetCodeSyncPage';
import WhiteboardPage from './pages/WhiteboardPage';
import NotepadPage from './pages/NotepadPage';
import ProtectedRoute from './components/ProtectedRoute';

function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#cbd5e1',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  return isAuthenticated ? <DashboardPage /> : <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Home / Landing or Auth Dashboard */}
          <Route path="/" element={<RootRoute />} />

          {/* Protected Application Routes (Visible after signin only) */}
          <Route
            path="/curriculum"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planly"
            element={
              <ProtectedRoute>
                <PlanlyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contests"
            element={
              <ProtectedRoute>
                <ContestsExamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leetcode"
            element={
              <ProtectedRoute>
                <LeetCodeSyncPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/whiteboard"
            element={
              <ProtectedRoute>
                <WhiteboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notepad"
            element={
              <ProtectedRoute>
                <NotepadPage />
              </ProtectedRoute>
            }
          />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
