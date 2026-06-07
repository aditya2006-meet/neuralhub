const express = require('express');
const Tool = require('../models/tool');
const Review = require('../models/review');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ─── POST seed tools (run once) ──────────────────────────────────────────────
// MUST be before /:id and /:slug routes or Express matches "admin" as a param
router.post('/admin/seed', async (req, res) => {
  try {
    await Tool.deleteMany({});
    const tools = [
      { name: 'TextGenius Pro', slug: 'textgenius-pro', description: 'Generate blog posts, ads, and social copy with GPT-4-level quality and brand voice control.', longDescription: 'TextGenius Pro is the most advanced text generation tool on the marketplace. It supports 50+ content types, brand voice customization, tone adjustment, and bulk generation. Perfect for marketers, bloggers, and content teams.', icon: '✍️', category: 'text', badge: 'free', tags: ['writing', 'blog', 'marketing', 'gpt'], usageCount: 42000, averageRating: 4.9, reviewCount: 312 },
      { name: 'DreamCanvas AI', slug: 'dreamcanvas-ai', description: 'State-of-the-art image generation. Photorealistic, illustration, or concept art in seconds.', longDescription: 'DreamCanvas AI uses the latest diffusion models to generate stunning images from text prompts. Supports multiple styles, aspect ratios, and batch generation. Includes an inpainting tool for editing existing images.', icon: '🖼️', category: 'image', badge: 'pro', tags: ['image', 'art', 'diffusion', 'creative'], usageCount: 91000, averageRating: 4.8, reviewCount: 521 },
      { name: 'CodePilot X', slug: 'codepilot-x', description: 'AI pair programmer trained on 200M+ repos. Autocomplete, refactor, and explain code instantly.', longDescription: 'CodePilot X supports 40+ programming languages and integrates with VS Code, JetBrains, and Neovim. Features include smart autocomplete, bug detection, code explanation, and automatic documentation generation.', icon: '💻', category: 'code', badge: 'new', tags: ['code', 'programming', 'autocomplete', 'refactor'], usageCount: 68000, averageRating: 4.9, reviewCount: 441 },
      { name: 'VoiceLab Studio', slug: 'voicelab-studio', description: 'Clone voices, generate narrations, and create multilingual audio at broadcast quality.', longDescription: 'VoiceLab Studio lets you create hyper-realistic AI voices from just 3 seconds of audio. Supports 29 languages, emotion control, and pacing adjustment. Export in MP3, WAV, or stream directly via API.', icon: '🎵', category: 'audio', badge: 'pro', tags: ['voice', 'audio', 'tts', 'narration'], usageCount: 28000, averageRating: 4.7, reviewCount: 198 },
      { name: 'DataMind Analytics', slug: 'datamind-analytics', description: 'Ask questions about your data in plain English. Visualize trends and generate reports automatically.', longDescription: 'DataMind connects to your database, CSV, or spreadsheet and lets you ask questions in natural language. Automatically generates charts, detects anomalies, and produces executive-ready PDF reports.', icon: '📊', category: 'data', badge: 'free', tags: ['data', 'analytics', 'sql', 'visualization'], usageCount: 33000, averageRating: 4.8, reviewCount: 267 },
      { name: 'AgentForge', slug: 'agentforge', description: 'Build autonomous AI agents that browse the web, write code, and complete multi-step tasks end-to-end.', longDescription: 'AgentForge lets you create, deploy, and monitor autonomous AI agents. Agents can browse the web, write and execute code, send emails, and interact with any API. Full audit log and rollback support included.', icon: '🤖', category: 'agent', badge: 'new', tags: ['agent', 'automation', 'autonomous', 'workflow'], usageCount: 19000, averageRating: 4.9, reviewCount: 143 },
      { name: 'SummarizeAI', slug: 'summarize-ai', description: 'Summarize documents, PDFs, YouTube videos, and web pages to key insights in one click.', longDescription: 'SummarizeAI supports inputs from PDFs, URLs, YouTube videos, and raw text. Choose from bullet points, executive summaries, or Q&A formats. Supports 20+ languages and outputs up to 10,000 word documents.', icon: '📋', category: 'text', badge: 'free', tags: ['summarize', 'pdf', 'youtube', 'research'], usageCount: 55000, averageRating: 4.7, reviewCount: 389 },
      { name: 'PixelRefine', slug: 'pixelrefine', description: 'AI-powered image enhancement — upscale, retouch, remove backgrounds, and colorize old photos.', longDescription: 'PixelRefine uses cutting-edge super-resolution and restoration models. Upscale images up to 8x, remove backgrounds in one click, restore old or damaged photos, and colorize black-and-white images automatically.', icon: '🎨', category: 'image', badge: 'pro', tags: ['upscale', 'enhance', 'background', 'restore'], usageCount: 37000, averageRating: 4.6, reviewCount: 224 },
      { name: 'TranscribeX', slug: 'transcribex', description: 'Real-time speech-to-text with speaker diarization in 90+ languages. 99.4% accuracy guaranteed.', longDescription: 'TranscribeX delivers industry-leading transcription accuracy powered by Whisper-based models. Features include speaker identification, timestamps, custom vocabulary, and real-time streaming via WebSocket API.', icon: '🎤', category: 'audio', badge: 'free', tags: ['transcribe', 'speech', 'whisper', 'multilingual'], usageCount: 61000, averageRating: 4.8, reviewCount: 412 },
    ];
    await Tool.insertMany(tools);
    res.json({ success: true, message: `${tools.length} tools seeded!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET all tools (with filter/search) ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, badge, search, sort = '-createdAt' } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (badge) filter.badge = badge;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
    const tools = await Tool.find(filter).sort(sort).populate('createdBy', 'name');
    res.json({ success: true, count: tools.length, tools });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET single tool by slug ─────────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug, isActive: true }).populate('createdBy', 'name');
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });
    // increment usage
    tool.usageCount += 1;
    await tool.save();
    res.json({ success: true, tool });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST save/unsave tool ───────────────────────────────────────────────────
router.post('/:id/save', protect, async (req, res) => {
  try {
    const user = req.user;
    const toolId = req.params.id;
    const saved = user.savedTools.includes(toolId);
    if (saved) {
      user.savedTools = user.savedTools.filter(id => id.toString() !== toolId);
    } else {
      user.savedTools.push(toolId);
    }
    await user.save();
    res.json({ success: true, saved: !saved, savedTools: user.savedTools });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET reviews for a tool ──────────────────────────────────────────────────
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ tool: req.params.id })
      .populate('user', 'name')
      .sort('-createdAt');
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST add review ─────────────────────────────────────────────────────────
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) return res.status(400).json({ success: false, message: 'Rating and comment required' });
    const existing = await Review.findOne({ tool: req.params.id, user: req.user._id });
    if (existing) return res.status(409).json({ success: false, message: 'You already reviewed this tool' });
    const review = await Review.create({ tool: req.params.id, user: req.user._id, rating, comment });
    await review.populate('user', 'name');
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;