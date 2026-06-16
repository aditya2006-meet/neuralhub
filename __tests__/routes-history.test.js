const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupDB } = require('./setup');
const createApp = require('./app');
const User = require('../models/user');
const Activity = require('../models/activity');

setupDB();

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

jest.mock('../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function createAuthUser(overrides = {}) {
  const user = await User.create({
    name: 'History Tester',
    email: `hist-${Date.now()}@test.com`,
    password: 'password123',
    ...overrides,
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  return { user, token };
}

describe('GET /api/history', () => {
  it('should return user history', async () => {
    const { user, token } = await createAuthUser();
    await Activity.create({
      user: user._id,
      toolSlug: 'textgenius-pro',
      toolName: 'TextGenius Pro',
      action: 'ran_ai',
    });

    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.history.length).toBe(1);
    expect(res.body.history[0].toolSlug).toBe('textgenius-pro');
  });

  it('should return at most 50 items sorted by newest first', async () => {
    const { user, token } = await createAuthUser();
    const activities = [];
    for (let i = 0; i < 55; i++) {
      activities.push({
        user: user._id,
        toolSlug: `tool-${i}`,
        toolName: `Tool ${i}`,
        createdAt: new Date(Date.now() - i * 1000),
      });
    }
    await Activity.insertMany(activities);

    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(50);
    // Should be sorted newest first
    expect(res.body.history[0].toolSlug).toBe('tool-0');
  });

  it('should not return other users history', async () => {
    const { user, token } = await createAuthUser();
    const otherUser = await User.create({ name: 'Other', email: `other-hist-${Date.now()}@test.com`, password: 'pass123' });
    await Activity.create({ user: otherUser._id, toolSlug: 'other-tool', toolName: 'Other Tool' });

    const res = await request(app)
      .get('/api/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(0);
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/history', () => {
  it('should save a new activity', async () => {
    const { user, token } = await createAuthUser();

    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolSlug: 'codepilot-x', toolName: 'CodePilot X', action: 'ran_ai', prompt: 'Write hello world' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.activity.toolSlug).toBe('codepilot-x');
    expect(res.body.activity.prompt).toBe('Write hello world');
  });

  it('should reject missing toolSlug', async () => {
    const { token } = await createAuthUser();

    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolName: 'Some Tool' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('toolSlug and toolName required');
  });

  it('should reject missing toolName', async () => {
    const { token } = await createAuthUser();

    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolSlug: 'some-tool' });

    expect(res.status).toBe(400);
  });

  it('should use defaults for optional fields', async () => {
    const { token } = await createAuthUser();

    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolSlug: 'test-tool', toolName: 'Test Tool' });

    expect(res.status).toBe(200);
    expect(res.body.activity.action).toBe('ran_ai');
    expect(res.body.activity.toolCategory).toBe('text');
  });

  it('should truncate prompt to 200 characters', async () => {
    const { token } = await createAuthUser();
    const longPrompt = 'a'.repeat(300);

    const res = await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolSlug: 'test-tool', toolName: 'Test', prompt: longPrompt });

    expect(res.status).toBe(200);
    expect(res.body.activity.prompt.length).toBe(200);
  });

  it('should keep only last 50 activities per user', async () => {
    const { user, token } = await createAuthUser();

    // Create 50 existing activities
    const activities = [];
    for (let i = 0; i < 50; i++) {
      activities.push({
        user: user._id,
        toolSlug: `old-tool-${i}`,
        toolName: `Old Tool ${i}`,
        createdAt: new Date(Date.now() - (50 - i) * 1000),
      });
    }
    await Activity.insertMany(activities);

    // Add one more
    await request(app)
      .post('/api/history')
      .set('Authorization', `Bearer ${token}`)
      .send({ toolSlug: 'new-tool', toolName: 'New Tool' });

    const count = await Activity.countDocuments({ user: user._id });
    expect(count).toBe(50);
  });
});

describe('DELETE /api/history', () => {
  it('should clear all history for the user', async () => {
    const { user, token } = await createAuthUser();
    await Activity.create({ user: user._id, toolSlug: 'tool-1', toolName: 'Tool 1' });
    await Activity.create({ user: user._id, toolSlug: 'tool-2', toolName: 'Tool 2' });

    const res = await request(app)
      .delete('/api/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('History cleared');

    const count = await Activity.countDocuments({ user: user._id });
    expect(count).toBe(0);
  });

  it('should not clear other users history', async () => {
    const { user, token } = await createAuthUser();
    const otherUser = await User.create({ name: 'Other', email: `other-del-${Date.now()}@test.com`, password: 'pass123' });
    await Activity.create({ user: otherUser._id, toolSlug: 'other-tool', toolName: 'Other Tool' });

    await request(app)
      .delete('/api/history')
      .set('Authorization', `Bearer ${token}`);

    const count = await Activity.countDocuments({ user: otherUser._id });
    expect(count).toBe(1);
  });

  it('should require authentication', async () => {
    const res = await request(app).delete('/api/history');
    expect(res.status).toBe(401);
  });
});
