/**
 * Picks only allowed fields from a source object.
 * Eliminates the repeated pattern:
 *   allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
 *
 * @param {Object} source - The source object (e.g. req.body)
 * @param {string[]} allowed - List of allowed field names
 * @returns {Object} Object containing only the allowed fields that are defined
 */
const pickFields = (source, allowed) => {
  const picked = {};
  for (const field of allowed) {
    if (source[field] !== undefined) {
      picked[field] = source[field];
    }
  }
  return picked;
};

module.exports = pickFields;
