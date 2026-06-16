/**
 * Standardized API response helpers.
 * Eliminates duplicated response formatting across route handlers.
 */

const success = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data });
};

const error = (res, message = 'Server error', statusCode = 500) => {
  return res.status(statusCode).json({ success: false, message });
};

module.exports = { success, error };
