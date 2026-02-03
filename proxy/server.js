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

// Proxy /api/* to backend (MUST be first to match before catch-all)
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: 'debug',
  secure: true,
  ws: true, // Enable WebSocket support
  cookieDomainRewrite: {
    'rydercupam-euzt.onrender.com': 'www.rydercupfriends.com',
    '.onrender.com': '.rydercupfriends.com',
    '*': '' // Remove domain for other cookies
  },
  cookiePathRewrite: {
    '*': '/' // All cookies available at root
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY API] ${req.method} ${req.url} → ${BACKEND_URL}${req.url}`);
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`[PROXY API] Response ${proxyRes.statusCode} from ${req.url}`);
    // Log cookies being set (after rewrite)
    const setCookie = proxyRes.headers['set-cookie'];
    if (setCookie) {
      console.log(`[PROXY API] Set-Cookie (rewritten):`, setCookie);
      console.log(`[PROXY API] Cookie domain rewrite: .onrender.com → .rydercupfriends.com`);
    }
  }
}));

// Proxy everything else to frontend
app.use('/', createProxyMiddleware({
  target: FRONTEND_URL,
  changeOrigin: true,
  logLevel: 'debug',
  secure: true,
  onProxyReq: (proxyReq, req) => {
    console.log(`[PROXY FRONTEND] ${req.method} ${req.url} → ${FRONTEND_URL}${req.url}`);
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on port ${PORT}`);
  console.log(`📡 Backend: ${BACKEND_URL}`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
});
