const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupDB } = require('./setup');
const createApp = require('./app');
const User = require('../models/user');

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
    name: 'Pay Tester',
    email: `pay-${Date.now()}@test.com`,
    password: 'password123',
    ...overrides,
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  return { user, token };
}

describe('GET /api/payments/plans', () => {
  it('should return available plans', async () => {
    const res = await request(app).get('/api/payments/plans');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plans).toHaveLength(3);
    expect(res.body.plans.map(p => p.id)).toEqual(['free', 'pro', 'enterprise']);
  });

  it('should include plan details', async () => {
    const res = await request(app).get('/api/payments/plans');

    const freePlan = res.body.plans.find(p => p.id === 'free');
    expect(freePlan.price).toBe(0);
    expect(freePlan.calls).toBe(100);

    const proPlan = res.body.plans.find(p => p.id === 'pro');
    expect(proPlan.price).toBe(29);
    expect(proPlan.calls).toBe(50000);
  });

  it('should indicate stripe is not configured when no key', async () => {
    const res = await request(app).get('/api/payments/plans');

    expect(res.body.stripeConfigured).toBe(false);
  });
});

describe('POST /api/payments/create-checkout', () => {
  it('should return error when Stripe is not configured', async () => {
    const { token } = await createAuthUser();

    const res = await request(app)
      .post('/api/payments/create-checkout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Stripe not configured. Add STRIPE_SECRET_KEY to .env');
  });

  it('should require authentication', async () => {
    const res = await request(app).post('/api/payments/create-checkout');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/payments/webhook', () => {
  it('should return 400 when Stripe is not configured', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ type: 'checkout.session.completed' })));

    expect(res.status).toBe(400);
  });
});
