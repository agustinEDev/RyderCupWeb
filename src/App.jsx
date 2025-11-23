import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Competitions from './pages/Competitions';
import CreateCompetition from './pages/CreateCompetition';
import CompetitionDetail from './pages/CompetitionDetail';
import BrowseCompetitions from './pages/BrowseCompetitions';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { migrateFromLocalStorage } from './utils/secureAuth';

function App() {
  // Migrate existing users from localStorage to sessionStorage
  useEffect(() => {
    migrateFromLocalStorage();
  }, []);

  return (
    <Router>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#131613',
            border: '1px solid #dee3df',
            borderRadius: '0.5rem',
            padding: '16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#2d7b3e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/competitions" element={<ProtectedRoute><Competitions /></ProtectedRoute>} />
        <Route path="/competitions/create" element={<ProtectedRoute><CreateCompetition /></ProtectedRoute>} />
        <Route path="/competitions/:id" element={<ProtectedRoute><CompetitionDetail /></ProtectedRoute>} />
        <Route path="/browse-competitions" element={<ProtectedRoute><BrowseCompetitions /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
