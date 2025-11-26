
/**
 * Row-Level Security (RLS) Helper
 * Automatically restricts database queries to user's accessible data
 */

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

/**
 * Enhanced Mongoose model wrapper with automatic RLS
 * Usage: const SecureModel = wrapModelWithRLS(Model);
 *        SecureModel.findSecure(req, filter)
 */
function wrapModelWithRLS(Model) {
  return {
    // Wrapped find method
    async findSecure(req, filter = {}, options = {}) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.find(rlsFilter, null, options);
    },
    
    // Wrapped findOne method
    async findOneSecure(req, filter = {}) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.findOne(rlsFilter);
    },
    
    // Wrapped findById with RLS check
    async findByIdSecure(req, id) {
      const rlsFilter = applyRLS(req, { _id: id });
      return await Model.findOne(rlsFilter);
    },
    
    // Wrapped update methods
    async updateOneSecure(req, filter, update, options = {}) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.updateOne(rlsFilter, update, options);
    },
    
    async updateManySecure(req, filter, update, options = {}) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.updateMany(rlsFilter, update, options);
    },
    
    // Wrapped delete methods
    async deleteOneSecure(req, filter) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.deleteOne(rlsFilter);
    },
    
    async deleteManySecure(req, filter) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.deleteMany(rlsFilter);
    },
    
    // Wrapped count
    async countSecure(req, filter = {}) {
      const rlsFilter = applyRLS(req, filter);
      return await Model.countDocuments(rlsFilter);
    },
    
    // Access to original model for admin operations
    Model,
  };
}

/**
 * Mongoose plugin to add RLS methods directly to models
 * Usage: schema.plugin(rlsPlugin);
 */
function rlsPlugin(schema) {
  // Add secure find method
  schema.statics.findSecure = function(req, filter = {}, options = {}) {
    const rlsFilter = applyRLS(req, filter);
    return this.find(rlsFilter, null, options);
  };
  
  schema.statics.findOneSecure = function(req, filter = {}) {
    const rlsFilter = applyRLS(req, filter);
    return this.findOne(rlsFilter);
  };
  
  schema.statics.findByIdSecure = function(req, id) {
    const rlsFilter = applyRLS(req, { _id: id });
    return this.findOne(rlsFilter);
  };
  
  schema.statics.updateOneSecure = function(req, filter, update, options = {}) {
    const rlsFilter = applyRLS(req, filter);
    return this.updateOne(rlsFilter, update, options);
  };
  
  schema.statics.updateManySecure = function(req, filter, update, options = {}) {
    const rlsFilter = applyRLS(req, filter);
    return this.updateMany(rlsFilter, update, options);
  };
  
  schema.statics.deleteOneSecure = function(req, filter) {
    const rlsFilter = applyRLS(req, filter);
    return this.deleteOne(rlsFilter);
  };
  
  schema.statics.deleteManySecure = function(req, filter) {
    const rlsFilter = applyRLS(req, filter);
    return this.deleteMany(rlsFilter);
  };
  
  schema.statics.countSecure = function(req, filter = {}) {
    const rlsFilter = applyRLS(req, filter);
    return this.countDocuments(rlsFilter);
  };
}

module.exports = { 
  applyRLS, 
  rlsMiddleware,
  wrapModelWithRLS,
  rlsPlugin,
};