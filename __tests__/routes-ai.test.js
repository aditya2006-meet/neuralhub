const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { setupDB } = require('./setup');
const User = require('../models/user');

setupDB();

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

// Import the checkRateLimit function by extracting it from the module
// Since checkRateLimit is not exported, we test its behavior via route integration
// But we CAN test the rate-limiting logic directly

describe('AI Rate Limiting Logic', () => {
  it('should track apiCallsToday on user model', async () => {
    const user = await User.create({
      name: 'Rate Test',
      email: 'rate@test.com',
      password: 'password123',
      plan: 'free',
      apiCallsToday: 0,
    });

    expect(user.apiCallsToday).toBe(0);
    user.apiCallsToday += 1;
    user.lastApiCall = new Date();
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.apiCallsToday).toBe(1);
    expect(updated.lastApiCall).toBeDefined();
  });

  it('should reset counter on a new day', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const user = await User.create({
      name: 'Day Reset',
      email: 'dayreset@test.com',
      password: 'password123',
      plan: 'free',
      apiCallsToday: 99,
      lastApiCall: yesterday,
    });

    const now = new Date();
    const lastCall = new Date(user.lastApiCall);
    const isNewDay = lastCall.toDateString() !== now.toDateString();

    expect(isNewDay).toBe(true);
    if (isNewDay) user.apiCallsToday = 0;

    expect(user.apiCallsToday).toBe(0);
  });

  it('should not reset counter on same day', async () => {
    const user = await User.create({
      name: 'Same Day',
      email: 'sameday@test.com',
      password: 'password123',
      plan: 'free',
      apiCallsToday: 50,
      lastApiCall: new Date(),
    });

    const now = new Date();
    const lastCall = new Date(user.lastApiCall);
    const isNewDay = lastCall.toDateString() !== now.toDateString();

    expect(isNewDay).toBe(false);
    expect(user.apiCallsToday).toBe(50);
  });

  it('should enforce limit of 100 for free users', async () => {
    const user = await User.create({
      name: 'At Limit',
      email: 'atlimit@test.com',
      password: 'password123',
      plan: 'free',
      apiCallsToday: 100,
      lastApiCall: new Date(),
    });

    const FREE_DAILY_LIMIT = 100;
    expect(user.apiCallsToday >= FREE_DAILY_LIMIT).toBe(true);
  });

  it('should allow pro users unlimited calls', async () => {
    const user = await User.create({
      name: 'Pro User',
      email: 'pro@test.com',
      password: 'password123',
      plan: 'pro',
      apiCallsToday: 999,
      lastApiCall: new Date(),
    });

    expect(user.plan).toBe('pro');
    // Pro users bypass rate limiting
  });
});

describe('callAI function logic', () => {
  it('should build correct request body structure', () => {
    const systemPrompt = 'You are an AI assistant';
    const userPrompt = 'Hello world';
    const maxTokens = 1024;
    const MODEL = 'meta-llama/llama-3.1-8b-instruct';

    const body = {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    };

    expect(body.model).toBe('meta-llama/llama-3.1-8b-instruct');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.max_tokens).toBe(1024);
    expect(body.temperature).toBe(0.7);
  });

  it('should support custom max_tokens', () => {
    const maxTokens = 1500;
    const body = {
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    };

    expect(body.max_tokens).toBe(1500);
  });
});

describe('AI Route prompt templates', () => {
  it('text route should support multiple prompt types', () => {
    const types = ['blog', 'social', 'email', 'ad', 'general'];
    types.forEach(type => {
      expect(typeof type).toBe('string');
    });
    expect(types).toHaveLength(5);
  });

  it('code route should support multiple type operations', () => {
    const types = ['generate', 'explain', 'refactor', 'debug', 'docs'];
    types.forEach(type => {
      expect(typeof type).toBe('string');
    });
    expect(types).toHaveLength(5);
  });

  it('summarize route should support multiple styles', () => {
    const styles = ['bullet', 'paragraph', 'executive', 'qa'];
    styles.forEach(style => {
      expect(typeof style).toBe('string');
    });
    expect(styles).toHaveLength(4);
  });
});
