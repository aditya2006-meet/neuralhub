const nodemailer = require('nodemailer');

jest.mock('nodemailer');

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

process.env.EMAIL_USER = 'test@gmail.com';
process.env.EMAIL_PASS = 'testpass';
process.env.CLIENT_URL = 'http://localhost:3000';

const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
  });

  it('should send verification email with correct params', async () => {
    await sendVerificationEmail('user@test.com', 'Test User', 'verification-token-123');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe('user@test.com');
    expect(mailOptions.subject).toBe('Verify your NeuralHub account');
    expect(mailOptions.html).toContain('Test User');
    expect(mailOptions.html).toContain('verification-token-123');
    expect(mailOptions.html).toContain('http://localhost:3000/verify-email.html?token=verification-token-123');
  });

  it('should include NeuralHub branding in the email', async () => {
    await sendVerificationEmail('user@test.com', 'Ada', 'token');

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('NeuralHub');
    expect(html).toContain('Verify Email');
  });
});

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
  });

  it('should send password reset email with correct params', async () => {
    await sendPasswordResetEmail('user@test.com', 'Test User', 'reset-token-456');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe('user@test.com');
    expect(mailOptions.subject).toBe('Reset your NeuralHub password');
    expect(mailOptions.html).toContain('reset-token-456');
    expect(mailOptions.html).toContain('http://localhost:3000/reset-password.html?token=reset-token-456');
  });

  it('should mention 1 hour expiry', async () => {
    await sendPasswordResetEmail('user@test.com', 'User', 'token');

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('1 hour');
  });
});

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
  });

  it('should send welcome email', async () => {
    await sendWelcomeEmail('user@test.com', 'Ada');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe('user@test.com');
    expect(mailOptions.subject).toContain('Welcome to NeuralHub');
    expect(mailOptions.html).toContain('Ada');
  });

  it('should include link to browse tools', async () => {
    await sendWelcomeEmail('user@test.com', 'User');

    const html = mockSendMail.mock.calls[0][0].html;
    expect(html).toContain('http://localhost:3000/tools.html');
    expect(html).toContain('Browse AI Tools');
  });
});
