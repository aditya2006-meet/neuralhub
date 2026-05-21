const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/user');

// Only init Stripe if key is provided
const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key'
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_placeholder';

// ─── Create checkout session ─────────────────────────────────────────────────
router.post('/create-checkout', protect, async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ success: false, message: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/dashboard.html?upgraded=true`,
      cancel_url: `${process.env.CLIENT_URL}/pricing.html`,
      metadata: { userId: req.user._id.toString() }
    });
    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Stripe webhook (upgrade user to pro) ───────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.sendStatus(400);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, { role: 'developer' });
    }
  }
  res.sendStatus(200);
});

// ─── Get plans info ──────────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      { id: 'free', name: 'Starter', price: 0, calls: 100, features: ['100 API calls/day', '50+ free models', 'Community support', 'No credit card required'] },
      { id: 'pro', name: 'Pro', price: 29, calls: 50000, features: ['50,000 API calls/mo', 'All 1,200+ models', 'Priority support', 'Custom webhooks', 'Analytics dashboard'] },
      { id: 'enterprise', name: 'Enterprise', price: null, calls: -1, features: ['Unlimited API calls', 'Private deployment', 'SLA & dedicated support', 'SSO & RBAC', 'On-premise options'] }
    ],
    stripeConfigured: !!stripe
  });
});

module.exports = router;
