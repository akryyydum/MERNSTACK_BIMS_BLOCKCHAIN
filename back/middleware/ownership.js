
function applyRLS(req, baseFilter = {}) {
  const user = req.user;
  if (!user) return baseFilter; // unauthenticated already blocked earlier

  // Admin / official have broader access
  if (user.role === 'admin' || user.role === 'official') {
    return baseFilter;
  }

  // Residents: restrict to documents linked to their user or residentId
  // Many collections store either user or resident references; we include both.
  const orConditions = [];
  if (user.id) orConditions.push({ user: user.id });
  if (user.residentId) orConditions.push({ resident: user.residentId });
  if (orConditions.length === 0) return baseFilter; // fallback

  // If baseFilter already has an $and, append; otherwise create one.
  if (Object.keys(baseFilter).length === 0) {
    return { $or: orConditions };
  }
  return { $and: [ baseFilter, { $or: orConditions } ] };
}

// Express middleware variant attaching a function for controllers to use.
function rlsMiddleware(req, _res, next) {
  req.applyRLS = (filter = {}) => applyRLS(req, filter);
  next();
}

module.exports = { applyRLS, rlsMiddleware };