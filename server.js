require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const toolRoutes = require('./routes/tools');
const paymentRoutes = require('./routes/payments');
const submissionRoutes = require('./routes/submissions');
const aiRoutes = require('./routes/ai');

const app = express();

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'NeuralHub API is running 🚀', timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/neuralhub')
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });