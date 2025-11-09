import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes (auth check inside component) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* TODO: Add more protected routes */}
        {/* <Route path="/profile" element={<Profile />} /> */}
        {/* <Route path="/competitions" element={<Competitions />} /> */}
        {/* <Route path="/competitions/create" element={<CreateCompetition />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
