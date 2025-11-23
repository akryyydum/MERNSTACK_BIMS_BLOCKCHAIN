const { z } = require('zod');

// Common schemas
const emailSchema = z.string().email().toLowerCase().trim();
const phoneSchema = z.string().regex(/^[0-9+\-\s()]+$/).min(10).max(20).optional();
const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const dateSchema = z.string().datetime().or(z.date());

// User schemas
const registerSchema = z.object({
  username: z.string().min(6).max(50).trim(),
  password: z.string().min(6).max(128),
  firstName: z.string().min(1).max(100).trim(),
  middleName: z.string().max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim(),
  suffix: z.string().max(10).trim().optional(),
  dateOfBirth: dateSchema,
  birthPlace: z.string().min(1).max(200).trim(),
  sex: z.enum(['Male', 'Female']),
  civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Separated', 'Divorced']),
  religion: z.string().max(100).trim().optional(),
  ethnicity: z.string().max(100).trim().optional(),
  address: z.object({
    purok: z.string().min(1).max(100).trim(),
    barangay: z.string().min(1).max(100).trim(),
    municipality: z.string().min(1).max(100).trim(),
    province: z.string().min(1).max(100).trim(),
  }),
  citizenship: z.string().min(1).max(100).trim(),
  occupation: z.string().max(200).trim().optional(),
  sectoralInformation: z.string().max(500).trim().optional(),
  registeredVoter: z.boolean().optional(),
  contact: z.object({
    email: emailSchema.optional(),
    mobile: phoneSchema,
  }).optional(),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1).trim(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6).max(128),
});

const requestOtpSchema = z.object({
  identifier: z.string().min(1).trim(),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(1).trim(),
  otp: z.string().length(6).regex(/^\d{6}$/),
  newPassword: z.string().min(6).max(128).optional(),
});

// Document request schemas
const documentRequestSchema = z.object({
  documentType: z.enum([
    'Barangay Clearance',
    'Certificate of Residency',
    'Certificate of Indigency',
    'Business Permit',
    'Community Tax Certificate',
    'Barangay ID'
  ]),
  purpose: z.string().min(1).max(500).trim(),
  notes: z.string().max(1000).trim().optional(),
});

// Complaint schemas
const complaintSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  category: z.enum([
    'Infrastructure',
    'Public Safety',
    'Utilities',
    'Environmental',
    'Health',
    'Other'
  ]).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  location: z.string().max(500).trim().optional(),
});

// Financial transaction schemas
const paymentSchema = z.object({
  amount: z.number().positive().max(1000000),
  paymentType: z.enum(['garbage', 'streetlight', 'utility', 'other']),
  referenceNumber: z.string().max(100).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
});

// Household schemas
const householdSchema = z.object({
  householdNumber: z.string().min(1).max(50).trim(),
  address: z.object({
    purok: z.string().min(1).max(100).trim(),
    barangay: z.string().min(1).max(100).trim(),
  }),
  headOfHousehold: mongoIdSchema.optional(),
  members: z.array(mongoIdSchema).optional(),
});

// Public document schemas
const publicDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().max(100).trim().optional(),
  tags: z.array(z.string().max(50).trim()).max(10).optional(),
});

// Notification schemas
const notificationSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(2000).trim(),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

// Middleware factory to validate requests
function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace body with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors,
        });
      }
      next(error);
    }
  };
}

// Query parameter validation
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          message: 'Query validation failed',
          errors,
        });
      }
      next(error);
    }
  };
}

// Params validation
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          message: 'Parameter validation failed',
          errors,
        });
      }
      next(error);
    }
  };
}

module.exports = {
  // Schemas
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  requestOtpSchema,
  verifyOtpSchema,
  documentRequestSchema,
  complaintSchema,
  paymentSchema,
  householdSchema,
  publicDocumentSchema,
  notificationSchema,
  mongoIdSchema,
  emailSchema,
  phoneSchema,
  
  // Middleware
  validate,
  validateQuery,
  validateParams,
};
