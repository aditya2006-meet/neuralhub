const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { setupDB } = require('./setup');
const createApp = require('./app');
const User = require('../models/user');

setupDB();

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:3000';

// Mock email utilities
jest.mock('../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

describe('POST /api/auth/signup', () => {
  it('should create a new user and return token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ada Lovelace', email: 'ada@test.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await User.create({ name: 'Existing', email: 'dup@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'New User', email: 'dup@test.com', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email already registered.');
  });

  it('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'noname@test.com', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test', email: 'not-an-email', password: 'secret123' });

    expect(res.status).toBe(400);
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test', email: 'short@test.com', password: '123' });

    expect(res.status).toBe(400);
  });

  it('should set role to developer when requested', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Dev', email: 'dev@test.com', password: 'secret123', role: 'developer' });

    expect(res.status).toBe(201);
    const user = await User.findOne({ email: 'dev@test.com' });
    expect(user.role).toBe('developer');
  });

  it('should not allow admin role via signup', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Admin', email: 'admin@test.com', password: 'secret123', role: 'admin' });

    expect(res.status).toBe(201);
    const user = await User.findOne({ email: 'admin@test.com' });
    expect(user.role).toBe('user');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await User.create({ name: 'Login User', email: 'login@test.com', password: 'password123' });
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('should reject missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('should reject missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/verify-email/:token', () => {
  it('should verify user with valid token', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    await User.create({
      name: 'Verify User',
      email: 'verify@test.com',
      password: 'password123',
      verificationToken: token,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const res = await request(app).get(`/api/auth/verify-email/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Email verified! You can now log in.');

    const user = await User.findOne({ email: 'verify@test.com' });
    expect(user.isVerified).toBe(true);
    expect(user.verificationToken).toBeUndefined();
  });

  it('should reject expired token', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    await User.create({
      name: 'Expired User',
      email: 'expired@test.com',
      password: 'password123',
      verificationToken: token,
      verificationExpires: Date.now() - 1000,
    });

    const res = await request(app).get(`/api/auth/verify-email/${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or expired verification link.');
  });

  it('should reject invalid token', async () => {
    const res = await request(app).get('/api/auth/verify-email/invalidtoken123');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or expired verification link.');
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('should respond with success message for existing email', async () => {
    await User.create({ name: 'Forgot User', email: 'forgot@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await User.findOne({ email: 'forgot@test.com' });
    expect(user.resetPasswordToken).toBeDefined();
    expect(user.resetPasswordExpires).toBeDefined();
  });

  it('should respond with success even for non-existent email (prevents enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noone@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/reset-password/:token', () => {
  it('should reset password with valid token', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    await User.create({
      name: 'Reset User',
      email: 'reset@test.com',
      password: 'oldpassword',
      resetPasswordToken: token,
      resetPasswordExpires: Date.now() + 60 * 60 * 1000,
    });

    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    // Verify old token is cleared
    const user = await User.findOne({ email: 'reset@test.com' });
    expect(user.resetPasswordToken).toBeUndefined();
  });

  it('should reject expired reset token', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    await User.create({
      name: 'Expired Reset',
      email: 'expreset@test.com',
      password: 'oldpassword',
      resetPasswordToken: token,
      resetPasswordExpires: Date.now() - 1000,
    });

    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or expired reset link.');
  });

  it('should reject short password during reset', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    await User.create({
      name: 'Short Pass',
      email: 'shortpass@test.com',
      password: 'oldpassword',
      resetPasswordToken: token,
      resetPasswordExpires: Date.now() + 60 * 60 * 1000,
    });

    const res = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: '12' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user when authenticated', async () => {
    const user = await User.create({ name: 'Me User', email: 'me@test.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('me@test.com');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/update-profile', () => {
  it('should update name and bio', async () => {
    const user = await User.create({ name: 'Old Name', email: 'profile@test.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .patch('/api/auth/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', bio: 'My new bio' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('New Name');
    expect(res.body.user.bio).toBe('My new bio');
  });

  it('should not allow updating non-allowed fields', async () => {
    const user = await User.create({ name: 'Secure', email: 'secure@test.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .patch('/api/auth/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin', email: 'hack@test.com' });

    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated.role).toBe('user');
    expect(updated.email).toBe('secure@test.com');
  });
});

describe('PATCH /api/auth/change-password', () => {
  it('should change password with correct current password', async () => {
    const user = await User.create({ name: 'Change', email: 'changepw@test.com', password: 'oldpassword123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    // Verify new password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'changepw@test.com', password: 'newpassword123' });
    expect(loginRes.status).toBe(200);
  });

  it('should reject wrong current password', async () => {
    const user = await User.create({ name: 'Wrong', email: 'wrongpw@test.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Current password is incorrect.');
  });
});

describe('DELETE /api/auth/delete-account', () => {
  it('should delete the authenticated user', async () => {
    const user = await User.create({ name: 'Delete Me', email: 'delete@test.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .delete('/api/auth/delete-account')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Account deleted.');

    const deleted = await User.findById(user._id);
    expect(deleted).toBeNull();
  });
});
