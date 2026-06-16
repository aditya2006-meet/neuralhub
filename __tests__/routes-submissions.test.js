const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupDB } = require('./setup');
const createApp = require('./app');
const User = require('../models/user');
const Tool = require('../models/tool');

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
    name: 'Sub Tester',
    email: `sub-${Date.now()}@test.com`,
    password: 'password123',
    ...overrides,
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  return { user, token };
}

describe('POST /api/submissions', () => {
  it('should allow developer to submit a tool', async () => {
    const { user, token } = await createAuthUser({ role: 'developer' });

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'My New Tool',
        description: 'An amazing AI tool',
        category: 'text',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tool.name).toBe('My New Tool');
    expect(res.body.tool.createdBy.toString()).toBe(user._id.toString());
  });

  it('should allow admin to submit a tool', async () => {
    const { token } = await createAuthUser({ role: 'admin' });

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Admin Tool',
        description: 'Admin submitted tool',
        category: 'code',
      });

    expect(res.status).toBe(201);
  });

  it('should reject regular user from submitting', async () => {
    const { token } = await createAuthUser({ role: 'user' });

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'User Tool',
        description: 'Should fail',
        category: 'text',
      });

    expect(res.status).toBe(403);
  });

  it('should reject submission without name', async () => {
    const { token } = await createAuthUser({ role: 'developer' });

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name', category: 'text' });

    expect(res.status).toBe(400);
  });

  it('should reject submission with invalid category', async () => {
    const { token } = await createAuthUser({ role: 'developer' });

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Cat', description: 'Invalid category', category: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('should generate a slug from the name', async () => {
    const { token } = await createAuthUser({ role: 'developer' });

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Amazing Tool', description: 'Test', category: 'image' });

    expect(res.status).toBe(201);
    expect(res.body.tool.slug).toMatch(/^my-amazing-tool-\d+$/);
  });
});

describe('GET /api/submissions/mine', () => {
  it('should return tools created by the current user', async () => {
    const { user, token } = await createAuthUser({ role: 'developer' });
    await Tool.create({
      name: 'My Tool',
      slug: `my-tool-${Date.now()}`,
      description: 'Test',
      category: 'text',
      createdBy: user._id,
    });

    const res = await request(app)
      .get('/api/submissions/mine')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tools.length).toBe(1);
  });

  it('should not return other users tools', async () => {
    const { token } = await createAuthUser({ role: 'developer' });
    const otherUser = await User.create({ name: 'Other', email: `other-${Date.now()}@test.com`, password: 'pass123' });
    await Tool.create({
      name: 'Other Tool',
      slug: `other-tool-${Date.now()}`,
      description: 'Test',
      category: 'text',
      createdBy: otherUser._id,
    });

    const res = await request(app)
      .get('/api/submissions/mine')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.tools.length).toBe(0);
  });
});

describe('PATCH /api/submissions/:id', () => {
  it('should update own tool', async () => {
    const { user, token } = await createAuthUser({ role: 'developer' });
    const tool = await Tool.create({
      name: 'Old Name',
      slug: `update-tool-${Date.now()}`,
      description: 'Old desc',
      category: 'text',
      createdBy: user._id,
    });

    const res = await request(app)
      .patch(`/api/submissions/${tool._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', description: 'New desc' });

    expect(res.status).toBe(200);
    expect(res.body.tool.name).toBe('New Name');
    expect(res.body.tool.description).toBe('New desc');
  });

  it('should not allow updating another users tool', async () => {
    const { token } = await createAuthUser({ role: 'developer' });
    const otherUser = await User.create({ name: 'Other Dev', email: `otherdev-${Date.now()}@test.com`, password: 'pass123' });
    const tool = await Tool.create({
      name: 'Not Mine',
      slug: `notmine-${Date.now()}`,
      description: 'Test',
      category: 'text',
      createdBy: otherUser._id,
    });

    const res = await request(app)
      .patch(`/api/submissions/${tool._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Tool not found or not yours');
  });
});

describe('DELETE /api/submissions/:id', () => {
  it('should delete own tool', async () => {
    const { user, token } = await createAuthUser({ role: 'developer' });
    const tool = await Tool.create({
      name: 'Delete Me',
      slug: `delete-tool-${Date.now()}`,
      description: 'Test',
      category: 'text',
      createdBy: user._id,
    });

    const res = await request(app)
      .delete(`/api/submissions/${tool._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tool deleted');

    const deleted = await Tool.findById(tool._id);
    expect(deleted).toBeNull();
  });

  it('should not allow deleting another users tool', async () => {
    const { token } = await createAuthUser({ role: 'developer' });
    const otherUser = await User.create({ name: 'Other', email: `otherdel-${Date.now()}@test.com`, password: 'pass123' });
    const tool = await Tool.create({
      name: 'Not Mine',
      slug: `notmine-del-${Date.now()}`,
      description: 'Test',
      category: 'text',
      createdBy: otherUser._id,
    });

    const res = await request(app)
      .delete(`/api/submissions/${tool._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);

    const stillExists = await Tool.findById(tool._id);
    expect(stillExists).not.toBeNull();
  });
});
