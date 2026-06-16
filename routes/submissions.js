const express = require('express');
const router = express.Router();
const Tool = require('../models/tool');
const { protect, restrictTo } = require('../middleware/auth');
const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const handleValidation = require('../utils/validate');
const pickFields = require('../utils/pickFields');

// ─── Submit a new tool (developers only) ─────────────────────────────────────
router.post('/', protect, restrictTo('developer', 'admin'), [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('category').isIn(['text','image','code','audio','data','agent']).withMessage('Invalid category'),
  body('icon').optional().trim()
], handleValidation, asyncHandler(async (req, res) => {
  const { name, description, longDescription, icon, category, badge, tags } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
  const tool = await Tool.create({
    name, slug, description, longDescription: longDescription || description,
    icon: icon || '🤖', category, badge: badge || 'free',
    tags: Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean),
    createdBy: req.user._id
  });
  success(res, { tool }, 201);
}));

// ─── Get my submitted tools ───────────────────────────────────────────────────
router.get('/mine', protect, asyncHandler(async (req, res) => {
  const tools = await Tool.find({ createdBy: req.user._id }).sort('-createdAt');
  success(res, { tools });
}));

// ─── Update my tool ───────────────────────────────────────────────────────────
router.patch('/:id', protect, asyncHandler(async (req, res) => {
  const tool = await Tool.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!tool) return error(res, 'Tool not found or not yours', 404);
  const updates = pickFields(req.body, ['name','description','longDescription','icon','badge','tags']);
  Object.assign(tool, updates);
  await tool.save();
  success(res, { tool });
}));

// ─── Delete my tool ───────────────────────────────────────────────────────────
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const tool = await Tool.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!tool) return error(res, 'Tool not found or not yours', 404);
  success(res, { message: 'Tool deleted' });
}));

module.exports = router;
