/**
 * Simple Reverse Proxy for Render
 * Routes /api/* to backend, everything else to frontend
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 10000;

const BACKEND_URL = process.env.BACKEND_URL || 'https://rydercupam-euzt.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.rydercupfriends.com';

// Proxy /api/* to backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} → ${BACKEND_URL}${req.url}`);
  }
}));

// Proxy everything else to frontend
app.use('/', createProxyMiddleware({
  target: FRONTEND_URL,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} → ${FRONTEND_URL}${req.url}`);
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
  console.log(`📡 Backend: ${BACKEND_URL}`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
});
