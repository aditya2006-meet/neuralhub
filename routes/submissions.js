const express = require('express');
const router = express.Router();
const Tool = require('../models/Tool');
const { protect, restrictTo } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// ─── Submit a new tool (developers only) ─────────────────────────────────────
router.post('/', protect, restrictTo('developer', 'admin'), [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('category').isIn(['text','image','code','audio','data','agent']).withMessage('Invalid category'),
  body('icon').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, description, longDescription, icon, category, badge, tags } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    const tool = await Tool.create({
      name, slug, description, longDescription: longDescription || description,
      icon: icon || '🤖', category, badge: badge || 'free',
      tags: Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean),
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, tool });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get my submitted tools ───────────────────────────────────────────────────
router.get('/mine', protect, async (req, res) => {
  try {
    const tools = await Tool.find({ createdBy: req.user._id }).sort('-createdAt');
    res.json({ success: true, tools });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Update my tool ───────────────────────────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const tool = await Tool.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found or not yours' });
    const allowed = ['name','description','longDescription','icon','badge','tags'];
    allowed.forEach(f => { if (req.body[f] !== undefined) tool[f] = req.body[f]; });
    await tool.save();
    res.json({ success: true, tool });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Delete my tool ───────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const tool = await Tool.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found or not yours' });
    res.json({ success: true, message: 'Tool deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;