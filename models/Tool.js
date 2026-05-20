const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  longDescription: { type: String, default: '' },
  icon: { type: String, default: '🤖' },
  category: {
    type: String,
    enum: ['text', 'image', 'code', 'audio', 'data', 'agent'],
    required: true
  },
  badge: { type: String, enum: ['free', 'pro', 'new'], default: 'free' },
  pricing: {
    free: { calls: { type: Number, default: 100 } },
    pro: { price: { type: Number, default: 29 }, calls: { type: Number, default: 50000 } }
  },
  tags: [String],
  apiEndpoint: { type: String, default: '' },
  demoAvailable: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tool', toolSchema);