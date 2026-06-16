const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Activity = require('../models/activity');

// GET user history (last 50)
router.get('/', protect, async (req, res) => {
  try {
    const history = await Activity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST save activity
router.post('/', protect, async (req, res) => {
  try {
    const { toolSlug, toolName, toolIcon, toolCategory, action, prompt } = req.body;
    if (!toolSlug || !toolName) return res.status(400).json({ success: false, message: 'toolSlug and toolName required' });

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

    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE clear all history
router.delete('/', protect, async (req, res) => {
  try {
    await Activity.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;