/**
 * Wraps an async route handler to automatically catch errors
 * and forward them to Express error middleware.
 * Eliminates repetitive try/catch + res.status(500) blocks.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
