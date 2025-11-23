# 🔐 Security Quick Reference Card

## Immediate Actions Required

### 1. Generate Secrets (5 minutes)
```bash
cd back
npm run security:generate-secret  # Copy output to .env as JWT_SECRET
npm run security:generate-secret  # Copy output to .env as JWT_REFRESH_SECRET
```

### 2. Install Dependencies (2 minutes)
```bash
npm install
```

### 3. Configure Environment (3 minutes)
```bash
cp .env.example .env
# Edit .env - Update at minimum:
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - MONGODB_URI
# - EMAIL_* settings
```

### 4. Test Security (2 minutes)
```bash
npm run security:audit  # Should pass
npm start               # Should start without errors
```

---

## Common Commands

```bash
# Generate secret
npm run security:generate-secret

# Check secret rotation
npm run security:check-secrets

# Security audit
npm run security:audit

# Fix vulnerabilities
npm run security:audit-fix

# Full security scan
npm run security:full-scan

# Check server health
curl http://localhost:4000/health

# Check metrics (as admin)
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/metrics
```

---

## New API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/refresh-token` | POST | None | Refresh access token |
| `/api/auth/logout` | POST | None | Invalidate refresh token |
| `/metrics` | GET | Admin | Prometheus metrics |
| `/health` | GET | None | Health check |

---

## Frontend Token Management

```javascript
// Store tokens after login
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);

// Auto-refresh on 401
if (response.status === 401) {
  const newToken = await refreshAccessToken();
  // Retry original request with new token
}

// Logout
await fetch('/api/auth/logout', {
  method: 'POST',
  body: JSON.stringify({ 
    refreshToken: localStorage.getItem('refreshToken') 
  }),
});
localStorage.clear();
```

---

## Security Headers Applied

- ✅ Content-Security-Policy (CSP)
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy

---

## Rate Limits

| Route | Limit | Window |
|-------|-------|--------|
| Auth endpoints | 20 req | 1 hour |
| Admin finance/complaints | 60 req | 1 hour |
| Socket events | 60 events | 1 min |
| Global | 1000 req | 15 min |

---

## Validation Schemas Available

```javascript
const { validate, loginSchema, registerSchema, 
        documentRequestSchema, complaintSchema } = require('./middleware/schema');

// Use in routes
router.post('/endpoint', validate(schema), handler);
```

---

## Audit Logging

```javascript
const { logCrudOperation, logAdminAction, ActionType } = require('./utils/auditLogger');

// Log actions
await logCrudOperation(ActionType.CREATE, 'document', docId, req);
await logAdminAction(ActionType.APPROVE, 'resident', residentId, req);
```

---

## Metrics Recording

```javascript
const { recordAuthAttempt, recordPayment, 
        recordSecurityEvent } = require('./utils/metrics');

recordAuthAttempt('success');
recordPayment('garbage', 500, 'success');
recordSecurityEvent('xss_blocked');
```

---

## File Upload Validation

```javascript
const { validateFile, createFileFilter } = require('./utils/fileValidation');

// In multer config
const upload = multer({
  fileFilter: createFileFilter({ category: 'documents', maxSizeMB: 10 }),
});

// Additional validation
const validation = await validateFile(req.file, { 
  category: 'documents',
  checkSignature: true 
});
```

---

## RLS (Row-Level Security)

```javascript
// Option 1: Manual
const filter = req.applyRLS({ status: 'active' });
const docs = await Model.find(filter);

// Option 2: Secure wrapper
const { wrapModelWithRLS } = require('./middleware/ownership');
const SecureModel = wrapModelWithRLS(Model);
const docs = await SecureModel.findSecure(req, { status: 'active' });

// Option 3: Plugin (add to schema)
const { rlsPlugin } = require('./middleware/ownership');
schema.plugin(rlsPlugin);
// Use Model.findSecure(req, filter)
```

---

## Sanitization

```javascript
// Automatic (global middleware in server.js)
// All req.body, req.query, req.params are sanitized

// Manual
const { sanitizeString, sanitizeObject } = require('./middleware/sanitize');
const clean = sanitizeString(userInput);
```

---

## CAPTCHA Setup

1. Get keys: https://www.google.com/recaptcha/admin
2. Add to `.env`:
   ```
   RECAPTCHA_ENABLED=true
   RECAPTCHA_SECRET_KEY=your_secret_key
   ```
3. Use middleware:
   ```javascript
   const { verifyCaptcha } = require('./middleware/captcha');
   router.post('/login', verifyCaptcha(), handler);
   ```

---

## Security Checklist

### Development
- [ ] Dependencies installed
- [ ] Secrets generated
- [ ] .env configured
- [ ] npm audit passed

### Testing
- [ ] Rate limits tested
- [ ] Token refresh works
- [ ] Validation tested
- [ ] Audit logs working

### Production
- [ ] HTTPS enabled
- [ ] CAPTCHA enabled
- [ ] Production secrets
- [ ] CORS configured
- [ ] Monitoring setup
- [ ] Backups configured

---

## Emergency Contacts

- **Security Issues:** See SECURITY.md
- **Documentation:** SECURITY_IMPLEMENTATION.md
- **Full Summary:** SECURITY_INTEGRATION_SUMMARY.md

---

## Monitoring Alerts

Watch for:
- Failed login attempts > 5
- Rate limit exceeded
- 401/403 spikes
- Slow database queries
- Large file uploads
- Security events in logs

---

## Incident Response (Quick)

1. **Identify** - Check audit logs & metrics
2. **Contain** - Disable account, block IP
3. **Eradicate** - Remove threat, patch
4. **Recover** - Restore from backup
5. **Document** - Record incident

Full procedures in SECURITY.md

---

**Keep this card handy for quick reference!**

Last Updated: 2025-11-23
