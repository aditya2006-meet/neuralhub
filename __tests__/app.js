const express = require('express');

const authRoutes = require('../routes/auth');
const toolRoutes = require('../routes/tools');
const paymentRoutes = require('../routes/payments');
const submissionRoutes = require('../routes/submissions');
const historyRoutes = require('../routes/history');

function createApp() {
  const app = express();

  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/tools', toolRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/history', historyRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'NeuralHub API is running', timestamp: new Date() });
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });

  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
