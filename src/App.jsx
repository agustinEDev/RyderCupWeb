import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* TODO: Add protected routes */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        {/* <Route path="/profile" element={<Profile />} /> */}
        {/* <Route path="/competitions" element={<Competitions />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
