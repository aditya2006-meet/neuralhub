const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { setupDB } = require('./setup');
const User = require('../models/user');
const { protect, restrictTo } = require('../middleware/auth');

setupDB();

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('protect middleware', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test User',
      email: 'protect@test.com',
      password: 'password123',
    });
  });

  it('should reject request with no token', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Not authorized. Please log in.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject request with invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Invalid or expired token.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject request with token for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: fakeId }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User no longer exists.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should set req.user and call next with valid token', async () => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user._id.toString()).toBe(user._id.toString());
  });

  it('should reject request without Bearer prefix', async () => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const req = { headers: { authorization: token } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('restrictTo middleware', () => {
  it('should allow access for permitted roles', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    restrictTo('admin', 'developer')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should deny access for non-permitted roles', () => {
    const req = { user: { role: 'user' } };
    const res = mockRes();
    const next = jest.fn();

    restrictTo('admin', 'developer')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'You do not have permission to do this.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow developer role when developer is permitted', () => {
    const req = { user: { role: 'developer' } };
    const res = mockRes();
    const next = jest.fn();

    restrictTo('developer')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
