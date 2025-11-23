# Security Implementation Guide

This document provides implementation details for all security measures in the MERN Stack BIMS Blockchain system.

## Quick Start

### 1. Install New Dependencies

```bash
cd back
npm install zod sanitize-html mime-types prom-client
```

### 2. Update Environment Variables

Add to `back/.env`:

```env
# JWT Token Configuration
JWT_SECRET=your_very_long_random_secret_here_at_least_64_chars
JWT_REFRESH_SECRET=different_very_long_random_secret_for_refresh_tokens
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# reCAPTCHA Configuration (optional, for production)
RECAPTCHA_ENABLED=false
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_from_google

# Security Configuration
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX=20
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Feature Implementation Guide

### Central Validation with Zod

#### Already Integrated
- ✅ Schemas defined in `middleware/schema.js`
- ✅ Validation middleware created
- ✅ Auth routes updated

#### To Use in Other Routes

```javascript
const { validate, documentRequestSchema } = require('../middleware/schema');

// Apply to route
router.post('/documents', auth, validate(documentRequestSchema), controller.createDocument);
```

#### Create Custom Schema

```javascript
const { z } = require('zod');

const customSchema = z.object({
  fieldName: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  age: z.number().int().positive().max(120),
});

// Use it
router.post('/endpoint', validate(customSchema), handler);
```

### XSS Sanitization

#### Already Integrated
- ✅ Global sanitization middleware in `server.js`
- ✅ Sanitizes all incoming requests automatically

#### Manual Sanitization

```javascript
const { sanitizeString, sanitizeObject } = require('../middleware/sanitize');

// Sanitize a string
const clean = sanitizeString(userInput);

// Sanitize an object
const cleanData = sanitizeObject(req.body);

// Sanitize specific fields only
const { sanitizeFields } = require('../middleware/sanitize');
router.post('/endpoint', sanitizeFields(['description', 'notes']), handler);
```

### Row-Level Security (RLS)

#### Basic Usage (Current)

```javascript
// In controller
async function getDocuments(req, res) {
  const filter = req.applyRLS({ status: 'approved' });
  const docs = await Document.find(filter);
  res.json(docs);
}
```

#### Advanced Usage (New Helper Methods)

**Option 1: Secure Model Wrapper**

```javascript
const { wrapModelWithRLS } = require('../middleware/ownership');
const Document = require('../models/document.model');

const SecureDocument = wrapModelWithRLS(Document);

async function getDocuments(req, res) {
  // Automatically applies RLS
  const docs = await SecureDocument.findSecure(req, { status: 'approved' });
  res.json(docs);
}
```

**Option 2: Mongoose Plugin**

```javascript
// In model file
const { rlsPlugin } = require('../middleware/ownership');

const documentSchema = new mongoose.Schema({
  // ... your schema
});

documentSchema.plugin(rlsPlugin);

// In controller
async function getDocuments(req, res) {
  const docs = await Document.findSecure(req, { status: 'approved' });
  res.json(docs);
}
```

### Socket.IO Rate Limiting

#### Already Integrated
- ✅ Rate limiter configured in `config/socket.js`
- ✅ 60 events per minute per socket

#### Customize Rate Limits

```javascript
// In config/socket.js
const socketRateLimiter = new SocketRateLimiter({
  capacity: 120,      // Max events in bucket
  refillRate: 2,      // Tokens per second (120/min)
  cleanupInterval: 300000, // Cleanup every 5 minutes
});
```

### Token Management (Access + Refresh)

#### Client-Side Implementation

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usernameOrEmail, password }),
});

const { accessToken, refreshToken, role, userData } = await response.json();

// Store tokens securely
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Use access token for requests
fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

// Refresh token when access token expires
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await response.json();
  
  localStorage.setItem('accessToken', newAccessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  
  return newAccessToken;
}

// Automatic token refresh on 401
async function fetchWithAuth(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
  };
  
  let response = await fetch(url, options);
  
  if (response.status === 401) {
    // Token expired, refresh it
    accessToken = await refreshAccessToken();
    options.headers['Authorization'] = `Bearer ${accessToken}`;
    response = await fetch(url, options);
  }
  
  return response;
}
```

### File Upload Validation

#### Basic Implementation

```javascript
const multer = require('multer');
const { createFileFilter, validateFile, generateSafeFilename } = require('../utils/fileValidation');

// Configure multer with validation
const upload = multer({
  dest: 'uploads/temp',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: createFileFilter({ category: 'documents', maxSizeMB: 10 }),
});

// Route
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    // Additional validation
    const validation = await validateFile(req.file, {
      category: 'documents',
      maxSizeMB: 10,
      checkSignature: true,
    });
    
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    // Generate safe filename
    const safeFilename = generateSafeFilename(req.file.originalname);
    
    // Move file to final destination
    const finalPath = path.join('uploads', safeFilename);
    await fs.rename(req.file.path, finalPath);
    
    res.json({ filename: safeFilename });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

#### With Quarantine

```javascript
const { quarantineFile, releaseFromQuarantine } = require('../utils/fileValidation');

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    // Quarantine file
    const quarantinePath = await quarantineFile(req.file.path);
    
    // Validate
    const validation = await validateFile({ ...req.file, path: quarantinePath });
    
    if (!validation.valid) {
      await deleteFile(quarantinePath);
      return res.status(400).json({ errors: validation.errors });
    }
    
    // Optional: Scan with antivirus here
    
    // Release from quarantine
    const finalPath = path.join('uploads', generateSafeFilename(req.file.originalname));
    await releaseFromQuarantine(quarantinePath, finalPath);
    
    res.json({ filename: path.basename(finalPath) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### Audit Logging

#### Manual Logging

```javascript
const { logCrudOperation, logAdminAction, ActionType } = require('../utils/auditLogger');

// Log CRUD operations
async function updateDocument(req, res) {
  const doc = await Document.findByIdAndUpdate(req.params.id, req.body);
  
  await logCrudOperation(
    ActionType.UPDATE,
    'document',
    doc._id,
    req,
    { changes: req.body }
  );
  
  res.json(doc);
}

// Log admin actions
async function approveDocument(req, res) {
  const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'approved' });
  
  await logAdminAction(
    ActionType.APPROVE,
    'document',
    doc._id,
    req,
    { previousStatus: 'pending' }
  );
  
  res.json(doc);
}
```

#### Automatic Logging with Middleware

```javascript
const { auditMiddleware, ActionType } = require('../utils/auditLogger');

// Apply to routes
router.get(
  '/documents/:id',
  auth,
  auditMiddleware({
    action: ActionType.READ,
    resource: 'document',
    extractResourceId: (req) => req.params.id,
  }),
  controller.getDocument
);
```

#### Retrieve Audit Logs

```javascript
const { getAuditLogs, getAuditStats } = require('../utils/auditLogger');

// Get logs with filters
const result = await getAuditLogs(
  {
    userId: '507f1f77bcf86cd799439011',
    action: 'delete',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
  },
  {
    page: 1,
    limit: 50,
    sort: { timestamp: -1 },
  }
);

// Get statistics
const stats = await getAuditStats({
  startDate: '2025-01-01',
  userRole: 'admin',
});
```

### Monitoring Metrics

#### Access Metrics

```bash
# Authenticate as admin
curl -H "Authorization: Bearer <admin_token>" http://localhost:4000/metrics
```

#### Record Custom Metrics

```javascript
const { 
  recordDocumentRequest,
  recordComplaint,
  recordPayment,
  recordSecurityEvent,
} = require('../utils/metrics');

// Record business events
recordDocumentRequest('Barangay Clearance', 'pending');
recordComplaint('Infrastructure', 'open');
recordPayment('garbage', 500, 'success');

// Record security events
recordSecurityEvent('xss_blocked');
recordSecurityEvent('sql_injection_attempt');
```

### CAPTCHA Integration

#### Backend Setup

```env
RECAPTCHA_ENABLED=true
RECAPTCHA_SECRET_KEY=your_secret_key_from_google
```

```javascript
const { verifyCaptcha } = require('../middleware/captcha');

// Apply to routes
router.post('/register', verifyCaptcha(), validate(registerSchema), controller.register);
router.post('/login', verifyCaptcha({ minScore: 0.7 }), validate(loginSchema), controller.login);
```

#### Frontend Setup

**1. Add reCAPTCHA Script**

```html
<!-- In index.html -->
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
```

**2. Generate Token on Form Submit**

```javascript
// For reCAPTCHA v3 (invisible)
async function handleSubmit(e) {
  e.preventDefault();
  
  // Get reCAPTCHA token
  const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'login' });
  
  // Include in request
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail,
      password,
      captchaToken: token,
    }),
  });
}
```

**3. For reCAPTCHA v2 (checkbox)**

```javascript
// Add callback
function onCaptchaSuccess(token) {
  document.getElementById('captchaToken').value = token;
}

// In HTML
<div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY" data-callback="onCaptchaSuccess"></div>
<input type="hidden" id="captchaToken" name="captchaToken">
```

## Testing Security Features

### Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..25}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"usernameOrEmail":"test","password":"test"}'
done
```

### Test Input Validation

```bash
# Test XSS protection
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","password":"test123"}'
```

### Test Audit Logging

```bash
# Perform action, then check logs
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:4000/api/admin/audit-logs?limit=10
```

### Run Security Scans

```bash
# NPM audit
npm audit --omit=dev

# Run ZAP scan (requires Docker)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:4000
```

## Production Deployment Checklist

- [ ] Update all environment variables with production secrets
- [ ] Enable CAPTCHA (`RECAPTCHA_ENABLED=true`)
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS enforcement
- [ ] Set up database backups
- [ ] Configure monitoring alerts
- [ ] Test token refresh flow
- [ ] Verify rate limits are effective
- [ ] Run full security scan
- [ ] Review audit log storage capacity
- [ ] Set up secret rotation reminders
- [ ] Document incident response procedures
- [ ] Train team on security practices

## Troubleshooting

### Issue: Validation errors on valid inputs

**Solution**: Check Zod schema definitions in `middleware/schema.js` and adjust constraints.

### Issue: Token refresh not working

**Solution**: Ensure `JWT_REFRESH_SECRET` is set and different from `JWT_SECRET`.

### Issue: Rate limit too restrictive

**Solution**: Adjust limits in `server.js` or per-route configurations.

### Issue: Socket events blocked

**Solution**: Check rate limiter configuration in `config/socket.js`, increase capacity if needed.

### Issue: File upload rejected

**Solution**: Verify MIME type and file signature match, check file size limits.

## Support

For security issues, see SECURITY.md for reporting procedures.

For implementation questions, open a GitHub issue with the `security` label.

---

**Last Updated**: 2025-11-23
