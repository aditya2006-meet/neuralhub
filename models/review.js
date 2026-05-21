const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

// One review per user per tool
reviewSchema.index({ tool: 1, user: 1 }, { unique: true });

// Auto-update tool average rating after save
reviewSchema.post('save', async function() {
  const Tool = require('./Tool');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { tool: this.tool } },
    { $group: { _id: '$tool', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  if (stats.length > 0) {
    await Tool.findByIdAndUpdate(this.tool, {
      averageRating: Math.round(stats[0].avg * 10) / 10,
      reviewCount: stats[0].count
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);
