import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-primary mb-4">
                  🏆 Ryder Cup Manager
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  Sistema de gestión de torneos de golf amateur
                </p>
                <div className="space-x-4">
                  <button className="btn-primary">
                    Iniciar Sesión
                  </button>
                  <button className="btn-secondary">
                    Registrarse
                  </button>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
