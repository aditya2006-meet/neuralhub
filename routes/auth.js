const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/user');
const { protect } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const asyncHandler = require('../utils/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const handleValidation = require('../utils/validate');
const pickFields = require('../utils/pickFields');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const sendToken = (user, statusCode, res) => success(res, { token: generateToken(user._id), user }, statusCode);

// SIGNUP
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidation, asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return error(res, 'Email already registered.', 409);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name, email, password,
    role: role === 'developer' ? 'developer' : 'user',
    verificationToken,
    verificationExpires: Date.now() + 24 * 60 * 60 * 1000
  });
  try { await sendVerificationEmail(email, name, verificationToken); } catch(e) { console.log('Email error:', e.message); }
  sendToken(user, 201, res);
}));

// LOGIN
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], handleValidation, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    return error(res, 'Invalid email or password.', 401);
  sendToken(user, 200, res);
}));

// VERIFY EMAIL
router.get('/verify-email/:token', asyncHandler(async (req, res) => {
  const user = await User.findOne({
    verificationToken: req.params.token,
    verificationExpires: { $gt: Date.now() }
  });
  if (!user) return error(res, 'Invalid or expired verification link.', 400);
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save();
  try { await sendWelcomeEmail(user.email, user.name); } catch(e) {}
  success(res, { message: 'Email verified! You can now log in.' });
}));

// FORGOT PASSWORD
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return success(res, { message: 'If that email exists, a reset link has been sent.' });
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  await user.save();
  try { await sendPasswordResetEmail(user.email, user.name, resetToken); } catch(e) { console.log('Email error:', e.message); }
  success(res, { message: 'Password reset link sent to your email.' });
}));

// RESET PASSWORD
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidation, asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) return error(res, 'Invalid or expired reset link.', 400);
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  sendToken(user, 200, res);
}));

// RESEND VERIFICATION
router.post('/resend-verification', protect, asyncHandler(async (req, res) => {
  if (req.user.isVerified) return success(res, { message: 'Already verified.' });
  const token = crypto.randomBytes(32).toString('hex');
  req.user.verificationToken = token;
  req.user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await req.user.save();
  await sendVerificationEmail(req.user.email, req.user.name, token);
  success(res, { message: 'Verification email sent!' });
}));

// GET ME
router.get('/me', protect, (req, res) => {
  success(res, { user: req.user });
});

// UPDATE PROFILE
router.patch('/update-profile', protect, asyncHandler(async (req, res) => {
  const updates = pickFields(req.body, ['name', 'bio', 'avatar']);
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  success(res, { user });
}));

// CHANGE PASSWORD
router.patch('/change-password', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword)))
    return error(res, 'Current password is incorrect.', 401);
  user.password = req.body.newPassword;
  await user.save();
  sendToken(user, 200, res);
}));

// DELETE ACCOUNT
router.delete('/delete-account', protect, asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  success(res, { message: 'Account deleted.' });
}));

module.exports = router;
