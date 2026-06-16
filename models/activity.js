const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toolSlug: { type: String, required: true },
  toolName: { type: String, required: true },
  toolIcon: { type: String, default: '🤖' },
  toolCategory: { type: String, default: 'text' },
  action: { type: String, default: 'ran_ai' }, // ran_ai, saved, reviewed
  prompt: { type: String, maxlength: 200 }, // first 200 chars of prompt
  createdAt: { type: Date, default: Date.now }
});

// Keep only last 50 activities per user
activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);