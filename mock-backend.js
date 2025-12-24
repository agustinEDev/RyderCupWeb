const express = require('express');
const app = express();

app.use(express.json());

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', version: '1.8.0' });
});

// Mock login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'panetetrinx@gmail.com' && password === 'Pruebas1234.') {
    res.cookie('access_token', 'mock-jwt-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    res.cookie('refresh_token', 'mock-refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    res.json({
      user: {
        id: 1,
        email: 'panetetrinx@gmail.com',
        firstName: 'Test',
        lastName: 'User'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Mock refresh token endpoint
app.post('/api/v1/auth/refresh-token', (req, res) => {
  res.cookie('access_token', 'mock-jwt-token-refreshed', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });
  res.json({ success: true });
});

// Mock countries endpoint
app.get('/api/v1/countries', (req, res) => {
  res.json([
    { code: 'ES', name_en: 'Spain', name_es: 'España' },
    { code: 'US', name_en: 'United States', name_es: 'Estados Unidos' }
  ]);
});

// Mock user profile endpoint
app.get('/api/v1/users/profile', (req, res) => {
  res.json({
    id: 1,
    email: 'panetetrinx@gmail.com',
    firstName: 'Test',
    lastName: 'User',
    handicap: 15.0
  });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Mock backend running on port ${PORT}`);
});