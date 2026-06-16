const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupDB } = require('./setup');
const createApp = require('./app');
const User = require('../models/user');
const Tool = require('../models/tool');
const Review = require('../models/review');

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
    name: 'Tool Tester',
    email: `tool-${Date.now()}@test.com`,
    password: 'password123',
    ...overrides,
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  return { user, token };
}

async function createTool(overrides = {}) {
  return Tool.create({
    name: 'Test Tool',
    slug: `test-tool-${Date.now()}`,
    description: 'A test tool',
    category: 'text',
    ...overrides,
  });
}

describe('GET /api/tools', () => {
  it('should return all active tools', async () => {
    await createTool({ slug: 'tool-a' });
    await createTool({ slug: 'tool-b' });

    const res = await request(app).get('/api/tools');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tools.length).toBe(2);
    expect(res.body.count).toBe(2);
  });

  it('should filter by category', async () => {
    await createTool({ slug: 'text-tool', category: 'text' });
    await createTool({ slug: 'image-tool', category: 'image' });

    const res = await request(app).get('/api/tools?category=text');

    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(1);
    expect(res.body.tools[0].category).toBe('text');
  });

  it('should filter by badge', async () => {
    await createTool({ slug: 'free-tool', badge: 'free' });
    await createTool({ slug: 'pro-tool', badge: 'pro' });

    const res = await request(app).get('/api/tools?badge=pro');

    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(1);
    expect(res.body.tools[0].badge).toBe('pro');
  });

  it('should search tools by name', async () => {
    await createTool({ slug: 'genius-tool', name: 'TextGenius' });
    await createTool({ slug: 'canvas-tool', name: 'DreamCanvas' });

    const res = await request(app).get('/api/tools?search=Genius');

    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(1);
    expect(res.body.tools[0].name).toBe('TextGenius');
  });

  it('should not return inactive tools', async () => {
    await createTool({ slug: 'active-tool', isActive: true });
    await createTool({ slug: 'inactive-tool', isActive: false });

    const res = await request(app).get('/api/tools');

    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(1);
  });
});

describe('GET /api/tools/:slug', () => {
  it('should return tool by slug and increment usage count', async () => {
    const tool = await createTool({ slug: 'my-tool', usageCount: 10 });

    const res = await request(app).get('/api/tools/my-tool');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tool.name).toBe('Test Tool');
    expect(res.body.tool.usageCount).toBe(11);
  });

  it('should return 404 for non-existent slug', async () => {
    const res = await request(app).get('/api/tools/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Tool not found');
  });

  it('should return 404 for inactive tool', async () => {
    await createTool({ slug: 'hidden-tool', isActive: false });

    const res = await request(app).get('/api/tools/hidden-tool');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/tools/:id/save', () => {
  it('should save a tool for the user', async () => {
    const { user, token } = await createAuthUser();
    const tool = await createTool({ slug: 'save-tool' });

    const res = await request(app)
      .post(`/api/tools/${tool._id}/save`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.saved).toBe(true);
  });

  it('should unsave a previously saved tool', async () => {
    const tool = await createTool({ slug: 'unsave-tool' });
    const { user, token } = await createAuthUser({ savedTools: [tool._id] });

    const res = await request(app)
      .post(`/api/tools/${tool._id}/save`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(false);
  });

  it('should require authentication', async () => {
    const tool = await createTool({ slug: 'auth-save-tool' });

    const res = await request(app).post(`/api/tools/${tool._id}/save`);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/tools/:id/reviews', () => {
  it('should return reviews for a tool', async () => {
    const user = await User.create({ name: 'Reviewer', email: 'reviewer@test.com', password: 'password123' });
    const tool = await createTool({ slug: 'reviewed-tool' });
    await Review.create({ tool: tool._id, user: user._id, rating: 5, comment: 'Great tool!' });

    const res = await request(app).get(`/api/tools/${tool._id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reviews.length).toBe(1);
    expect(res.body.reviews[0].rating).toBe(5);
    expect(res.body.reviews[0].comment).toBe('Great tool!');
  });

  it('should return empty array when no reviews exist', async () => {
    const tool = await createTool({ slug: 'no-reviews-tool' });

    const res = await request(app).get(`/api/tools/${tool._id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBe(0);
  });
});

describe('POST /api/tools/:id/reviews', () => {
  it('should create a review', async () => {
    const { user, token } = await createAuthUser();
    const tool = await createTool({ slug: 'review-create-tool' });

    const res = await request(app)
      .post(`/api/tools/${tool._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Nice tool!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.rating).toBe(4);
  });

  it('should reject duplicate review from same user', async () => {
    const { user, token } = await createAuthUser();
    const tool = await createTool({ slug: 'dup-review-tool' });
    await Review.create({ tool: tool._id, user: user._id, rating: 5, comment: 'First review' });

    const res = await request(app)
      .post(`/api/tools/${tool._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 3, comment: 'Second review' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('You already reviewed this tool');
  });

  it('should reject review without rating', async () => {
    const { token } = await createAuthUser();
    const tool = await createTool({ slug: 'no-rating-tool' });

    const res = await request(app)
      .post(`/api/tools/${tool._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'No rating' });

    expect(res.status).toBe(400);
  });

  it('should reject review without comment', async () => {
    const { token } = await createAuthUser();
    const tool = await createTool({ slug: 'no-comment-tool' });

    const res = await request(app)
      .post(`/api/tools/${tool._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5 });

    expect(res.status).toBe(400);
  });
});
