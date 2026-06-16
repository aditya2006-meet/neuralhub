const { validationResult } = require('express-validator');

/**
 * Middleware that checks express-validator results and returns
 * a 400 response if validation failed.
 * Replaces the repeated pattern:
 *   const errors = validationResult(req);
 *   if (!errors.isEmpty()) return res.status(400).json(...)
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = handleValidation;
