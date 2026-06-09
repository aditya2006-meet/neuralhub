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
      // ── TEXT ──────────────────────────────────────────────────────────────
      { name: 'TextGenius Pro', slug: 'textgenius-pro', description: 'Generate blog posts, ads, and social copy with GPT-4-level quality and brand voice control.', longDescription: 'TextGenius Pro is the most advanced text generation tool on the marketplace. It supports 50+ content types, brand voice customization, tone adjustment, and bulk generation. Perfect for marketers, bloggers, and content teams.', icon: '✍️', category: 'text', badge: 'free', tags: ['writing', 'blog', 'marketing', 'gpt'], usageCount: 42000, averageRating: 4.9, reviewCount: 312 },
      { name: 'SummarizeAI', slug: 'summarize-ai', description: 'Summarize documents, PDFs, YouTube videos, and web pages to key insights in one click.', longDescription: 'SummarizeAI supports inputs from PDFs, URLs, YouTube videos, and raw text. Choose from bullet points, executive summaries, or Q&A formats. Supports 20+ languages and outputs up to 10,000 word documents.', icon: '📋', category: 'text', badge: 'free', tags: ['summarize', 'pdf', 'youtube', 'research'], usageCount: 55000, averageRating: 4.7, reviewCount: 389 },
      { name: 'TranslateFlow', slug: 'translateflow', description: 'Neural machine translation across 120+ languages. Preserves tone, idioms, and technical jargon perfectly.', longDescription: 'TranslateFlow uses state-of-the-art multilingual models fine-tuned on domain-specific corpora. Supports real-time translation, document upload (PDF, DOCX), glossary management, and tone matching. Ideal for global businesses and content creators.', icon: '🌐', category: 'text', badge: 'pro', tags: ['translation', 'multilingual', 'localization', 'language'], usageCount: 38000, averageRating: 4.8, reviewCount: 276 },
      { name: 'CopySmith', slug: 'copysmith', description: 'AI copywriting for landing pages, emails, and product descriptions. A/B test variants instantly.', longDescription: 'CopySmith specializes in conversion-focused copy. Generate 10+ variants for any piece of content, test headlines, CTAs, and body copy in real time. Integrates with Shopify, Webflow, and HubSpot.', icon: '📣', category: 'text', badge: 'new', tags: ['copywriting', 'landing-page', 'email', 'conversion'], usageCount: 21000, averageRating: 4.6, reviewCount: 183 },

      // ── IMAGE ─────────────────────────────────────────────────────────────
      { name: 'DreamCanvas AI', slug: 'dreamcanvas-ai', description: 'State-of-the-art image generation. Photorealistic, illustration, or concept art in seconds.', longDescription: 'DreamCanvas AI uses the latest diffusion models to generate stunning images from text prompts. Supports multiple styles, aspect ratios, and batch generation. Includes an inpainting tool for editing existing images.', icon: '🖼️', category: 'image', badge: 'pro', tags: ['image', 'art', 'diffusion', 'creative'], usageCount: 91000, averageRating: 4.8, reviewCount: 521 },
      { name: 'PixelRefine', slug: 'pixelrefine', description: 'AI-powered image enhancement — upscale, retouch, remove backgrounds, and colorize old photos.', longDescription: 'PixelRefine uses cutting-edge super-resolution and restoration models. Upscale images up to 8x, remove backgrounds in one click, restore old or damaged photos, and colorize black-and-white images automatically.', icon: '🎨', category: 'image', badge: 'pro', tags: ['upscale', 'enhance', 'background', 'restore'], usageCount: 37000, averageRating: 4.6, reviewCount: 224 },
      { name: 'LogoMaker AI', slug: 'logomaker-ai', description: 'Generate professional logos, brand kits, and visual identities from a text description in 30 seconds.', longDescription: 'LogoMaker AI combines generative design with brand strategy. Describe your company and get 50+ logo variations with matching color palettes, typography pairings, and brand guidelines. Export in SVG, PNG, and PDF.', icon: '💎', category: 'image', badge: 'free', tags: ['logo', 'branding', 'design', 'identity'], usageCount: 47000, averageRating: 4.5, reviewCount: 318 },
      { name: 'FaceSwap Studio', slug: 'faceswap-studio', description: 'Realistic face-swapping and avatar creation for creative and entertainment projects.', longDescription: 'FaceSwap Studio uses advanced face detection and blending algorithms for seamless swaps. Create custom AI avatars, generate consistent character images, and animate them. Built-in privacy controls and watermarking.', icon: '🎭', category: 'image', badge: 'new', tags: ['avatar', 'face', 'creative', 'entertainment'], usageCount: 29000, averageRating: 4.4, reviewCount: 201 },

      // ── CODE ──────────────────────────────────────────────────────────────
      { name: 'CodePilot X', slug: 'codepilot-x', description: 'AI pair programmer trained on 200M+ repos. Autocomplete, refactor, and explain code instantly.', longDescription: 'CodePilot X supports 40+ programming languages and integrates with VS Code, JetBrains, and Neovim. Features include smart autocomplete, bug detection, code explanation, and automatic documentation generation.', icon: '💻', category: 'code', badge: 'new', tags: ['code', 'programming', 'autocomplete', 'refactor'], usageCount: 68000, averageRating: 4.9, reviewCount: 441 },
      { name: 'TestForge', slug: 'testforge', description: 'Auto-generate unit tests, integration tests, and test plans from your existing codebase.', longDescription: 'TestForge analyzes your code structure and automatically writes comprehensive test suites. Supports Jest, Pytest, JUnit, RSpec, and more. Achieves 90%+ coverage on first run and integrates with CI/CD pipelines.', icon: '🧪', category: 'code', badge: 'free', tags: ['testing', 'unit-test', 'ci-cd', 'quality'], usageCount: 24000, averageRating: 4.7, reviewCount: 189 },
      { name: 'SQLSage', slug: 'sqlsage', description: 'Write, optimize, and explain complex SQL queries with natural language. Supports all major databases.', longDescription: 'SQLSage understands your schema and writes optimized queries from plain English. Detects N+1 problems, suggests indexes, and explains execution plans in simple terms. Supports PostgreSQL, MySQL, SQLite, BigQuery, and Snowflake.', icon: '🗄️', category: 'code', badge: 'free', tags: ['sql', 'database', 'query', 'optimization'], usageCount: 31000, averageRating: 4.8, reviewCount: 234 },

      // ── AUDIO ─────────────────────────────────────────────────────────────
      { name: 'VoiceLab Studio', slug: 'voicelab-studio', description: 'Clone voices, generate narrations, and create multilingual audio at broadcast quality.', longDescription: 'VoiceLab Studio lets you create hyper-realistic AI voices from just 3 seconds of audio. Supports 29 languages, emotion control, and pacing adjustment. Export in MP3, WAV, or stream directly via API.', icon: '🎵', category: 'audio', badge: 'pro', tags: ['voice', 'audio', 'tts', 'narration'], usageCount: 28000, averageRating: 4.7, reviewCount: 198 },
      { name: 'TranscribeX', slug: 'transcribex', description: 'Real-time speech-to-text with speaker diarization in 90+ languages. 99.4% accuracy guaranteed.', longDescription: 'TranscribeX delivers industry-leading transcription accuracy powered by Whisper-based models. Features include speaker identification, timestamps, custom vocabulary, and real-time streaming via WebSocket API.', icon: '🎤', category: 'audio', badge: 'free', tags: ['transcribe', 'speech', 'whisper', 'multilingual'], usageCount: 61000, averageRating: 4.8, reviewCount: 412 },
      { name: 'MusicGen AI', slug: 'musicgen-ai', description: 'Compose royalty-free background music, jingles, and soundscapes from a text prompt or mood selection.', longDescription: 'MusicGen AI creates original music in any genre, tempo, and mood. Describe the vibe or select from 200+ presets. Output stems separately for mixing. All generated tracks are 100% royalty-free for commercial use.', icon: '🎼', category: 'audio', badge: 'new', tags: ['music', 'composition', 'royalty-free', 'soundscape'], usageCount: 18000, averageRating: 4.6, reviewCount: 142 },

      // ── DATA ──────────────────────────────────────────────────────────────
      { name: 'DataMind Analytics', slug: 'datamind-analytics', description: 'Ask questions about your data in plain English. Visualize trends and generate reports automatically.', longDescription: 'DataMind connects to your database, CSV, or spreadsheet and lets you ask questions in natural language. Automatically generates charts, detects anomalies, and produces executive-ready PDF reports.', icon: '📊', category: 'data', badge: 'free', tags: ['data', 'analytics', 'sql', 'visualization'], usageCount: 33000, averageRating: 4.8, reviewCount: 267 },
      { name: 'PredictIQ', slug: 'predictiq', description: 'No-code predictive analytics. Forecast sales, churn, and demand with AutoML in minutes.', longDescription: 'PredictIQ abstracts machine learning into a drag-and-drop interface. Upload your data, select a target metric, and get production-ready forecasting models. Includes confidence intervals, feature importance, and Slack/email alerts.', icon: '📈', category: 'data', badge: 'pro', tags: ['machine-learning', 'forecasting', 'automl', 'prediction'], usageCount: 15000, averageRating: 4.7, reviewCount: 118 },
      { name: 'ScraperBot', slug: 'scraperbot', description: 'Extract structured data from any website without writing a single line of code. Schedule and export.', longDescription: 'ScraperBot uses AI to understand webpage structure and extract tables, lists, and records automatically. Schedule recurring scrapes, handle pagination, and export to CSV, JSON, or directly to Google Sheets. Bypasses common anti-scraping measures.', icon: '🕷️', category: 'data', badge: 'free', tags: ['scraping', 'web-data', 'automation', 'extraction'], usageCount: 27000, averageRating: 4.5, reviewCount: 196 },

      // ── AGENT ─────────────────────────────────────────────────────────────
      { name: 'AgentForge', slug: 'agentforge', description: 'Build autonomous AI agents that browse the web, write code, and complete multi-step tasks end-to-end.', longDescription: 'AgentForge lets you create, deploy, and monitor autonomous AI agents. Agents can browse the web, write and execute code, send emails, and interact with any API. Full audit log and rollback support included.', icon: '🤖', category: 'agent', badge: 'new', tags: ['agent', 'automation', 'autonomous', 'workflow'], usageCount: 19000, averageRating: 4.9, reviewCount: 143 },
      { name: 'ResearchBot', slug: 'researchbot', description: 'AI research assistant that reads papers, finds sources, and compiles literature reviews automatically.', longDescription: 'ResearchBot scans academic databases, news sources, and the web to gather evidence on any topic. It cites sources in APA, MLA, or Chicago format, detects contradictions between papers, and produces structured research reports.', icon: '🔬', category: 'agent', badge: 'free', tags: ['research', 'papers', 'citations', 'academic'], usageCount: 23000, averageRating: 4.8, reviewCount: 172 },
      { name: 'SalesAgent AI', slug: 'salesagent-ai', description: 'Autonomous sales agent that qualifies leads, sends follow-ups, and books meetings on your behalf.', longDescription: 'SalesAgent AI connects to your CRM, drafts personalized outreach, handles objections in email threads, and books calendar slots without human intervention. Trained on 10M+ successful sales conversations.', icon: '💼', category: 'agent', badge: 'pro', tags: ['sales', 'crm', 'outreach', 'leads'], usageCount: 12000, averageRating: 4.7, reviewCount: 98 },
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
