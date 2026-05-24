const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email.html?token=${token}`;
  await transporter.sendMail({
    from: `"NeuralHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your NeuralHub account',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0e1318;color:#e8edf2;padding:2rem;border-radius:16px">
        <h1 style="color:#00e5b0;font-size:1.5rem;margin-bottom:0.5rem">NeuralHub</h1>
        <h2 style="font-size:1.2rem;margin-bottom:1rem">Welcome, ${name}! 👋</h2>
        <p style="color:#6b7a8d;margin-bottom:1.5rem">Click the button below to verify your email and activate your account.</p>
        <a href="${url}" style="background:#00e5b0;color:#080c10;padding:0.8rem 2rem;border-radius:100px;text-decoration:none;font-weight:600;display:inline-block">Verify Email</a>
        <p style="color:#6b7a8d;font-size:0.8rem;margin-top:1.5rem">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
  await transporter.sendMail({
    from: `"NeuralHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your NeuralHub password',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0e1318;color:#e8edf2;padding:2rem;border-radius:16px">
        <h1 style="color:#00e5b0;font-size:1.5rem;margin-bottom:0.5rem">NeuralHub</h1>
        <h2 style="font-size:1.2rem;margin-bottom:1rem">Reset your password</h2>
        <p style="color:#6b7a8d;margin-bottom:1.5rem">Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${url}" style="background:#00e5b0;color:#080c10;padding:0.8rem 2rem;border-radius:100px;text-decoration:none;font-weight:600;display:inline-block">Reset Password</a>
        <p style="color:#6b7a8d;font-size:0.8rem;margin-top:1.5rem">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `
  });
};

const sendWelcomeEmail = async (email, name) => {
  await transporter.sendMail({
    from: `"NeuralHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to NeuralHub! 🚀',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0e1318;color:#e8edf2;padding:2rem;border-radius:16px">
        <h1 style="color:#00e5b0;font-size:1.5rem;margin-bottom:0.5rem">NeuralHub</h1>
        <h2 style="font-size:1.2rem;margin-bottom:1rem">You're all set, ${name}! 🎉</h2>
        <p style="color:#6b7a8d;margin-bottom:1rem">Your account is verified. Start exploring 1,200+ AI tools.</p>
        <a href="${process.env.CLIENT_URL}/tools.html" style="background:#00e5b0;color:#080c10;padding:0.8rem 2rem;border-radius:100px;text-decoration:none;font-weight:600;display:inline-block">Browse AI Tools</a>
      </div>
    `
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail };