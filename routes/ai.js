const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/user');
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct';

const FREE_DAILY_LIMIT = 100;

// ─── Rate limit middleware ────────────────────────────────────────────────────
const checkRateLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Pro users have unlimited calls
    if (user.plan === 'pro') return next();

    const now = new Date();
    const lastCall = user.lastApiCall ? new Date(user.lastApiCall) : null;
    const isNewDay = !lastCall || lastCall.toDateString() !== now.toDateString();

    // Reset counter if it's a new day
    if (isNewDay) {
      user.apiCallsToday = 0;
    }

    if (user.apiCallsToday >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        message: `Daily limit of ${FREE_DAILY_LIMIT} API calls reached. Upgrade to Pro for unlimited access.`,
        upgradeUrl: '/pricing.html'
      });
    }

    // Increment and save
    user.apiCallsToday += 1;
    user.lastApiCall = now;
    await user.save();

    // Attach remaining calls info to response headers
    res.set('X-RateLimit-Limit', FREE_DAILY_LIMIT);
    res.set('X-RateLimit-Remaining', FREE_DAILY_LIMIT - user.apiCallsToday);
    next();
  } catch (err) {
    next(err);
  }
};

async function callAI(prompt) {
  console.log('Calling OpenRouter, key exists:', !!process.env.OPENROUTER_API_KEY);
  const res = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://aditya2006-meet.github.io/neuralhub',
      'X-Title': 'NeuralHub AI Marketplace'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024
    })
  });
  const data = await res.json();
  console.log('OpenRouter response:', JSON.stringify(data).slice(0, 200));
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

// TEXT GENERATION
router.post('/text', protect, checkRateLimit, async (req, res) => {
  try {
    const { prompt, type = 'general' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });
    const prompts = {
      blog: `Write a professional, engaging blog post about: ${prompt}\n\nInclude a title, introduction, 3 main sections with subheadings, and a conclusion.`,
      social: `Write 3 different social media posts about: ${prompt}\n\nOne for Twitter (under 280 chars), one for LinkedIn (professional), one for Instagram (with hashtags). Label each clearly.`,
      email: `Write a professional email about: ${prompt}\n\nInclude subject line, greeting, body, and sign-off.`,
      ad: `Write 3 compelling ad copies for: ${prompt}\n\nInclude headline, body text, and CTA for each.`,
      general: `${prompt}`
    };
    const result = await callAI(prompts[type] || prompts.general);
    res.json({ success: true, result, type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CODE GENERATION
router.post('/code', protect, checkRateLimit, async (req, res) => {
  try {
    const { prompt, language = 'javascript', type = 'generate' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });
    const prompts = {
      generate: `Write clean, well-commented ${language} code for: ${prompt}\n\nInclude the complete code, brief explanation, and example usage.`,
      explain: `Explain this code in simple terms:\n\`\`\`\n${prompt}\n\`\`\`\n\nExplain what it does, how it works, and any potential issues.`,
      refactor: `Refactor and improve this code:\n\`\`\`\n${prompt}\n\`\`\`\n\nProvide the improved version with explanation of changes.`,
      debug: `Debug this code and fix any issues:\n\`\`\`\n${prompt}\n\`\`\`\n\nIdentify bugs, provide fixed code, and explain what was wrong.`,
      docs: `Generate comprehensive documentation for this code:\n\`\`\`\n${prompt}\n\`\`\`\n\nInclude function descriptions, parameters, return values, and examples.`
    };
    const result = await callAI(prompts[type] || prompts.generate);
    res.json({ success: true, result, language, type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// SUMMARIZE
router.post('/summarize', protect, checkRateLimit, async (req, res) => {
  try {
    const { text, style = 'bullet' } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });
    const prompts = {
      bullet: `Summarize this text into clear bullet points with key insights:\n\n${text}`,
      paragraph: `Write a concise 2-3 paragraph summary of:\n\n${text}`,
      executive: `Create an executive summary with Key Points, Main Findings, and Recommendations:\n\n${text}`,
      qa: `Create a Q&A format summary with 5 key questions and answers:\n\n${text}`
    };
    const result = await callAI(prompts[style] || prompts.bullet);
    res.json({ success: true, result, style });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DATA ANALYSIS
router.post('/analyze', protect, checkRateLimit, async (req, res) => {
  try {
    const { data, question } = req.body;
    if (!data || !question) return res.status(400).json({ success: false, message: 'Data and question are required' });
    const result = await callAI(`Analyze this data and answer: ${question}\n\nData:\n${data}\n\nProvide direct answer, key insights, trends, and recommendations.`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// AI AGENT
router.post('/agent', protect, checkRateLimit, async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) return res.status(400).json({ success: false, message: 'Task is required' });
    const result = await callAI(`You are an autonomous AI agent. Complete this task step by step:\n\nTask: ${task}\n\nProvide task breakdown, execution of each step, final result, and summary.`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// IMAGE DESCRIPTION
router.post('/describe', protect, checkRateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });
    const result = await callAI(`Create a detailed, vivid image description for: ${prompt}\n\nDescribe composition, colors, lighting, mood, style, and key elements in detail.`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// TRANSCRIBE
router.post('/transcribe', protect, checkRateLimit, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
    const result = await callAI(`Convert this spoken content into a clean, formatted transcript with proper punctuation and paragraphs:\n\n${content}`);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CHAT
router.post('/chat', protect, checkRateLimit, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    const result = await callAI(message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;