import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';

// Protected Route — bina login ke dashboard nahi milega
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
};

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', (event) => {
        console.log('App opened with URL:', event.url);
        try {
          const urlObj = new URL(event.url);
          const token = urlObj.searchParams.get('token');
          const user = urlObj.searchParams.get('user');
          if (token && user) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', user);
            navigate('/dashboard');
          }
        } catch (err) {
          console.error("Deep link parse error:", err);
        }
      });
    }
  }, [navigate]);

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
      </Routes>
    </>
  );
}

export default App;