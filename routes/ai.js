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
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.plan === 'pro') return next();
    const now = new Date();
    const lastCall = user.lastApiCall ? new Date(user.lastApiCall) : null;
    const isNewDay = !lastCall || lastCall.toDateString() !== now.toDateString();
    if (isNewDay) user.apiCallsToday = 0;
    if (user.apiCallsToday >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        message: `Daily limit of ${FREE_DAILY_LIMIT} API calls reached. Upgrade to Pro for unlimited access.`,
        upgradeUrl: '/pricing.html'
      });
    }
    user.apiCallsToday += 1;
    user.lastApiCall = now;
    await user.save();
    res.set('X-RateLimit-Limit', FREE_DAILY_LIMIT);
    res.set('X-RateLimit-Remaining', FREE_DAILY_LIMIT - user.apiCallsToday);
    next();
  } catch (err) { next(err); }
};

// ─── Core AI call ─────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userPrompt, maxTokens = 1024) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  let response;
  try {
    response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://aditya2006-meet.github.io/neuralhub',
        'X-Title': 'NeuralHub AI Marketplace'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
  } catch (fetchErr) {
    console.error('OpenRouter API network error:', fetchErr.message);
    throw new Error('AI service is temporarily unavailable. Please try again.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`OpenRouter API returned ${response.status}: ${errorText}`);
    throw new Error(`AI service error (${response.status}). Please try again.`);
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    console.error('Failed to parse OpenRouter response:', parseErr.message);
    throw new Error('Received invalid response from AI service.');
  }

  if (data.error) {
    throw new Error(data.error.message || 'AI service returned an error');
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Unexpected OpenRouter response structure:', JSON.stringify(data).slice(0, 200));
    throw new Error('AI service returned an unexpected response format.');
  }

  return data.choices[0].message.content;
}

// ─── TEXT GENERATION ──────────────────────────────────────────────────────────
router.post('/text', protect, checkRateLimit, async (req, res) => {
  try {
    const { prompt, type = 'general' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    const system = `You are TextGenius Pro, an expert AI copywriter and content creator. You produce high-quality, engaging, conversion-focused content. Format your output clearly with proper headings and structure. Be specific, creative, and professional.`;

    const prompts = {
      blog: `Write a complete, engaging blog post about: "${prompt}"\n\nStructure:\n# [Compelling Title]\n\n[Hook introduction - 2-3 sentences]\n\n## [Section 1 heading]\n[Content]\n\n## [Section 2 heading]\n[Content]\n\n## [Section 3 heading]\n[Content]\n\n## Conclusion\n[Wrap up with key takeaway and CTA]`,

      social: `Create 3 platform-optimized social media posts about: "${prompt}"\n\n**Twitter/X** (max 280 chars):\n[punchy, engaging tweet with 1-2 hashtags]\n\n**LinkedIn** (professional):\n[3-4 sentences, thought leadership angle, 3 hashtags]\n\n**Instagram** (visual storytelling):\n[2-3 sentences with emojis + 5-8 relevant hashtags]`,

      email: `Write a professional email about: "${prompt}"\n\n**Subject:** [compelling subject line]\n\nHi [Name],\n\n[Opening - establish context]\n\n[Main body - clear value proposition, 2-3 short paragraphs]\n\n[Clear CTA]\n\nBest regards,\n[Your Name]`,

      ad: `Create 3 high-converting ad copies for: "${prompt}"\n\n**Ad 1 - Problem/Solution:**\n• Headline: [max 30 chars]\n• Body: [max 90 chars]\n• CTA: [action button text]\n\n**Ad 2 - Benefit-focused:**\n• Headline: [max 30 chars]\n• Body: [max 90 chars]\n• CTA: [action button text]\n\n**Ad 3 - Social Proof:**\n• Headline: [max 30 chars]\n• Body: [max 90 chars]\n• CTA: [action button text]`,

      general: `${prompt}\n\nProvide a clear, well-structured, helpful response.`
    };

    const result = await callAI(system, prompts[type] || prompts.general);
    res.json({ success: true, result, type });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CODE GENERATION ──────────────────────────────────────────────────────────
router.post('/code', protect, checkRateLimit, async (req, res) => {
  try {
    const { prompt, language = 'javascript', type = 'generate' } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    const system = `You are CodePilot X, an expert software engineer and AI pair programmer. You write clean, efficient, production-ready code with clear comments. You follow best practices, handle edge cases, and explain your reasoning clearly. Always format code in proper markdown code blocks.`;

    const prompts = {
      generate: `Write clean, production-ready ${language} code for: "${prompt}"\n\n## Implementation\n\`\`\`${language}\n[complete code with comments]\n\`\`\`\n\n## How it works\n[brief explanation]\n\n## Usage example\n\`\`\`${language}\n[example usage]\n\`\`\`\n\n## Edge cases handled\n[list key edge cases]`,

      explain: `Explain this ${language} code clearly:\n\`\`\`${language}\n${prompt}\n\`\`\`\n\n## What it does\n[high-level overview]\n\n## Line-by-line breakdown\n[explain key parts]\n\n## Potential issues\n[any bugs, performance concerns, or improvements]`,

      refactor: `Refactor this ${language} code to be cleaner and more efficient:\n\`\`\`${language}\n${prompt}\n\`\`\`\n\n## Refactored version\n\`\`\`${language}\n[improved code]\n\`\`\`\n\n## What changed and why\n[explain each improvement]`,

      debug: `Debug this ${language} code and fix all issues:\n\`\`\`${language}\n${prompt}\n\`\`\`\n\n## Issues found\n[list each bug]\n\n## Fixed code\n\`\`\`${language}\n[corrected code]\n\`\`\`\n\n## Explanation\n[what was wrong and why]`,

      docs: `Generate comprehensive documentation for this ${language} code:\n\`\`\`${language}\n${prompt}\n\`\`\`\n\n## Overview\n[what this code does]\n\n## API Reference\n[document each function/class/method with params, returns, examples]\n\n## Usage examples\n\`\`\`${language}\n[practical examples]\n\`\`\``
    };

    const result = await callAI(system, prompts[type] || prompts.generate, 1500);
    res.json({ success: true, result, language, type });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── SUMMARIZE ────────────────────────────────────────────────────────────────
router.post('/summarize', protect, checkRateLimit, async (req, res) => {
  try {
    const { text, style = 'bullet' } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    const system = `You are SummarizeAI, an expert at distilling complex information into clear, concise insights. You identify the most important points, key data, and actionable takeaways. Your summaries are accurate, well-structured, and save readers significant time.`;

    const prompts = {
      bullet: `Summarize the following into clear bullet points:\n\n${text}\n\n## Key Insights\n• [most important point]\n• [second point]\n• [continue for all major points]\n\n## Bottom Line\n[one sentence summary]`,

      paragraph: `Write a concise paragraph summary of:\n\n${text}\n\nStart with the main thesis, cover key supporting points, and end with the significance or implication.`,

      executive: `Create an executive summary of:\n\n${text}\n\n## Executive Summary\n\n**Overview:** [2-3 sentence summary]\n\n**Key Findings:**\n1. [finding 1]\n2. [finding 2]\n3. [finding 3]\n\n**Recommendations:**\n• [action item 1]\n• [action item 2]\n\n**Bottom Line:** [1 sentence conclusion]`,

      qa: `Create a Q&A summary of:\n\n${text}\n\n**Q: What is the main topic?**\nA: [answer]\n\n**Q: What are the key points?**\nA: [answer]\n\n**Q: What are the implications?**\nA: [answer]\n\n**Q: What action should be taken?**\nA: [answer]\n\n**Q: What is the conclusion?**\nA: [answer]`
    };

    const result = await callAI(system, prompts[style] || prompts.bullet);
    res.json({ success: true, result, style });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── DATA ANALYSIS ────────────────────────────────────────────────────────────
router.post('/analyze', protect, checkRateLimit, async (req, res) => {
  try {
    const { data, question } = req.body;
    if (!data || !question) return res.status(400).json({ success: false, message: 'Data and question are required' });

    const system = `You are DataMind Analytics, an expert data analyst and statistician. You analyze data to find patterns, trends, anomalies, and actionable insights. You present findings clearly with specific numbers and concrete recommendations.`;

    const result = await callAI(system, `Analyze this data and answer: "${question}"\n\nData:\n${data}\n\n## Direct Answer\n[answer the question directly]\n\n## Key Insights\n• [insight 1 with specific data points]\n• [insight 2]\n• [insight 3]\n\n## Trends\n[patterns or trends observed]\n\n## Recommendations\n1. [actionable recommendation]\n2. [recommendation]\n3. [recommendation]`);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── AI AGENT ─────────────────────────────────────────────────────────────────
router.post('/agent', protect, checkRateLimit, async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) return res.status(400).json({ success: false, message: 'Task is required' });

    const system = `You are AgentForge, an autonomous AI agent capable of breaking down complex tasks and executing them step by step. You think methodically, plan before acting, and deliver complete results. You are thorough, precise, and always verify your work.`;

    const result = await callAI(system, `Complete this task autonomously: "${task}"\n\n## Task Analysis\n[understand what needs to be done]\n\n## Execution Plan\n1. [step 1]\n2. [step 2]\n3. [step 3]\n\n## Execution\n\n**Step 1:** [detailed execution]\n\n**Step 2:** [detailed execution]\n\n**Step 3:** [detailed execution]\n\n## Result\n[final deliverable or answer]\n\n## Summary\n[what was accomplished]`, 1500);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── IMAGE DESCRIPTION ────────────────────────────────────────────────────────
router.post('/describe', protect, checkRateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    const system = `You are DreamCanvas AI, an expert visual artist and creative director. You create vivid, detailed image descriptions that could be used as prompts for image generation models. Your descriptions are rich with visual details, artistic direction, and emotional tone.`;

    const result = await callAI(system, `Create a detailed AI image generation prompt for: "${prompt}"\n\n## Image Description\n[vivid, detailed description of the scene]\n\n## Style & Mood\n[artistic style, lighting, atmosphere, color palette]\n\n## Technical Details\n[camera angle, composition, rendering style]\n\n## Optimized Prompt\n[clean, ready-to-use prompt for Midjourney/DALL-E/Stable Diffusion]\n\n## Negative Prompt\n[things to avoid in the image]`);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── TRANSCRIBE ───────────────────────────────────────────────────────────────
router.post('/transcribe', protect, checkRateLimit, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const system = `You are TranscribeX, a professional transcription and audio content processor. You clean up raw transcripts, add proper punctuation, identify speakers, and format content for maximum readability. You preserve the speaker's voice while improving clarity.`;

    const result = await callAI(system, `Process and clean this transcript/audio content:\n\n${content}\n\n## Clean Transcript\n[properly punctuated, formatted transcript]\n\n## Speaker Summary\n[who said what - if multiple speakers detected]\n\n## Key Points Mentioned\n• [main topic 1]\n• [main topic 2]\n• [main topic 3]\n\n## Action Items\n[any tasks or decisions mentioned]`);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────
router.post('/chat', protect, checkRateLimit, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const system = `You are NeuralHub Assistant, a helpful, knowledgeable AI assistant. You provide clear, accurate, and useful responses. You are friendly, concise, and always try to provide actionable information.`;

    const result = await callAI(system, message);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;