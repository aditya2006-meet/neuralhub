const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Activity = require('../models/activity');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');

// GET user history (last 50)
router.get('/', protect, asyncHandler(async (req, res) => {
  const history = await Activity.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  success(res, { history });
}));

// POST save activity
router.post('/', protect, asyncHandler(async (req, res) => {
  const { toolSlug, toolName, toolIcon, toolCategory, action, prompt } = req.body;
  if (!toolSlug || !toolName) return error(res, 'toolSlug and toolName required', 400);

  const activity = await Activity.create({
    user: req.user._id,
    toolSlug,
    toolName,
    toolIcon: toolIcon || '🤖',
    toolCategory: toolCategory || 'text',
    action: action || 'ran_ai',
    prompt: prompt ? prompt.slice(0, 200) : ''
  });

  // Keep only last 50 per user
  const count = await Activity.countDocuments({ user: req.user._id });
  if (count > 50) {
    const oldest = await Activity.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(count - 50);
    await Activity.deleteMany({ _id: { $in: oldest.map(a => a._id) } });
  }

  success(res, { activity });
}));

// DELETE clear all history
router.delete('/', protect, asyncHandler(async (req, res) => {
  await Activity.deleteMany({ user: req.user._id });
  success(res, { message: 'History cleared' });
}));

module.exports = router;
