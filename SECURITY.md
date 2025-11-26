# Security Policy & Practices

This document outlines the comprehensive security measures, policies, and procedures implemented in the MERN Stack BIMS Blockchain system.

## 1. Automated Code & Dependency Scans
- **Dependabot**: Configured to create daily PRs for `npm` (root, `back`, `front`) and weekly for GitHub Actions.
- **Snyk**: GitHub Actions workflow (`.github/workflows/security.yml`) runs vulnerability scans on PRs and nightly.
- **CodeQL**: Static analysis for JavaScript on PRs and schedule.

## 2. Rate Limiting
- `express-rate-limit` applied: strict (20/hour) on `/api/auth` and moderate (60/hour) on sensitive finance/complaint admin routes; global safety cap.

## 3. Row-Level Security (RLS)
- Middleware `middleware/ownership.js` attaches `req.applyRLS(filter)` for controllers to scope queries to the authenticated resident (unless admin/official). Future controller refactors should wrap Mongo queries with this helper.

## 4. HTTPS Enforcement
- Middleware redirects HTTP to HTTPS in production using `x-forwarded-proto`. App trusts proxy for accurate protocol detection.

## 5. Input Sanitization & Validation
- `helmet` sets secure headers.
- `express-mongo-sanitize` strips `$`/`.` from inputs to prevent NoSQL injection.
- Dedicated validation middleware (`middleware/validate.js`) for auth register/login pre-checks; controllers retain deeper validation.
- Prototype pollution guard removing dangerous keys.

## 6. Secrets & Configuration
- Secrets sourced through environment variables; **never commit tokens** (e.g. SNYK_TOKEN must be added as a GitHub repository secret).

## 7. XSS Protection & Sanitization
- **sanitize-html**: All user inputs are sanitized to remove malicious HTML/JavaScript before persistence.
- Middleware: `middleware/sanitize.js` recursively sanitizes request body, query, and params.
- Applied globally after JSON parsing to ensure all text fields are cleaned.

## 8. Central Validation (Zod)
- **Schema validation**: Comprehensive Zod schemas defined in `middleware/schema.js`.
- All endpoints validate inputs against strict schemas before processing.
- Covers: authentication, document requests, complaints, payments, households, and more.
- Prevents invalid data types, injection attacks, and malformed requests.

## 9. Socket.IO Rate Limiting
- **Token bucket algorithm**: Limits socket events to 60 per minute per connection.
- Prevents DoS attacks via WebSocket flooding.
- Implemented in `middleware/socketRateLimit.js` and integrated in `config/socket.js`.
- Automatic cleanup of disconnected socket buckets.

## 10. Enhanced Token Management
- **Short-lived access tokens**: 15-minute expiry (configurable).
- **Long-lived refresh tokens**: 7-day expiry with rotation support.
- **Token refresh endpoint**: `/api/auth/refresh-token` for seamless token renewal.
- **Secure logout**: Token invalidation support (ready for token blacklist).
- Implemented in `utils/tokenManager.js`.

## 11. File Upload Security
- **MIME type validation**: Whitelist of allowed file types (images, PDFs, Office docs).
- **File signature verification**: Checks magic numbers to prevent MIME type spoofing.
- **Size limits**: Configurable maximum file size (default 10MB).
- **Quarantine system**: Files temporarily stored in quarantine folder for scanning.
- **Safe filename generation**: Prevents directory traversal and special character exploits.
- Implemented in `utils/fileValidation.js`.

## 12. Comprehensive Audit Logging
- **All sensitive operations logged**: Authentication, CRUD operations, admin actions, security events.
- **Captured data**: User ID, role, action, resource, IP address, user agent, timestamp, outcome.
- **Audit log retrieval**: Filterable and paginated audit log API for compliance.
- **Statistics**: Audit metrics for monitoring and reporting.
- Implemented in `utils/auditLogger.js` using `models/logs.model.js`.

## 13. Security Monitoring & Metrics
- **Prometheus metrics**: HTTP requests, authentication attempts, rate limits, database operations, socket connections.
- **Business metrics**: Document requests, complaints, payments tracking.
- **Security metrics**: Failed logins, security events, blocked attacks.
- **Metrics endpoint**: `/metrics` (admin-only access).
- Implemented in `utils/metrics.js`.

## 14. CAPTCHA Protection
- **reCAPTCHA v2/v3 support**: Prevents automated attacks on registration, login, and password reset.
- **Configurable thresholds**: Adjustable score requirements for v3.
- **Flexible integration**: Middleware ready for deployment when frontend integration is complete.
- Implemented in `middleware/captcha.js`.
- **Configuration**: Set `RECAPTCHA_ENABLED=true` and `RECAPTCHA_SECRET_KEY` in `.env`.

## 15. Enhanced Security Headers
- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS.
- **HSTS**: Forces HTTPS connections for 1 year with subdomain inclusion.
- **Frame protection**: X-Frame-Options set to DENY to prevent clickjacking.
- **Permissions Policy**: Disables geolocation, microphone, camera, and payment APIs.
- **XSS Filter**: Browser XSS protection enabled.
- **MIME Sniffing**: Disabled to prevent content-type attacks.

## 16. Automated Security Testing
- **GitHub Actions workflow**: Weekly automated security scans.
- **NPM Audit**: Dependency vulnerability scanning with severity gates.
- **OWASP ZAP**: Baseline security scanning for common web vulnerabilities.
- **Static code analysis**: Checks for hardcoded secrets and security TODOs.
- Configuration: `.github/workflows/security-scan.yml` and `.zap/rules.tsv`.

## 17. Dependency Management
- **Dependabot**: Automated dependency updates for security patches.
- **Weekly schedule**: Checks for updates every Monday.
- **Separate tracking**: Backend, frontend, and blockchain dependencies monitored independently.
- Configuration: `.github/dependabot.yml`.

---

## Security Incident Response

### Breach Detection Indicators
- Multiple failed login attempts from same IP (>5 in 5 minutes)
- Unusual spike in 401/403 responses
- Rate limit exceeded events clustering
- Database query anomalies (slow queries, mass deletions)
- Unexpected admin privilege escalation
- File upload anomalies (rejected files, large uploads)

### Immediate Response Steps

#### 1. Contain the Incident (0-15 minutes)
1. **Identify affected systems**: Check audit logs and metrics endpoints
2. **Isolate compromised accounts**: 
   ```bash
   # Disable user account
   db.users.updateOne({ _id: ObjectId("...") }, { $set: { isActive: false } })
   ```
3. **Block malicious IPs**: Update firewall rules or CDN settings
4. **Enable emergency rate limiting**: Reduce limits temporarily in `server.js`

#### 2. Assess Damage (15-60 minutes)
1. **Query audit logs**: 
   ```javascript
   // Check recent admin actions
   GET /api/admin/audit-logs?startDate=<timestamp>&action=DELETE
   ```
2. **Review database changes**: Check for unauthorized modifications
3. **Identify compromised data**: Determine scope of data exposure
4. **Document timeline**: Record all observed activities

#### 3. Eradicate Threat (1-4 hours)
1. **Remove backdoors**: Search for suspicious code changes
2. **Patch vulnerabilities**: Apply security updates immediately
3. **Reset compromised credentials**:
   ```bash
   # Force password reset for affected users
   db.users.updateMany({ _id: { $in: [...] }}, { $set: { passwordResetRequired: true }})
   ```
4. **Revoke all active tokens**: Clear JWT tokens, force re-authentication

#### 4. Recovery (4-24 hours)
1. **Restore from backup**: If data loss occurred, restore from latest clean backup
2. **Verify system integrity**: Run security scans (ZAP, npm audit)
3. **Monitor closely**: Increase logging verbosity temporarily
4. **Gradual re-enablement**: Restore services one by one

#### 5. Post-Incident (1-7 days)
1. **Root cause analysis**: Determine how breach occurred
2. **Update security measures**: Implement additional controls
3. **Notify affected parties**: Comply with data breach notification laws
4. **Documentation**: Create incident report with lessons learned

---

## Secret Rotation Procedures

### JWT Secret Rotation (Every 90 Days)

#### Preparation
1. Generate new secret:
   ```bash
   openssl rand -base64 64
   ```
2. Store in secure location (AWS Secrets Manager, Azure Key Vault, etc.)
3. Schedule maintenance window (low-traffic period)

#### Rotation Steps
1. **Dual-token period** (24 hours):
   ```javascript
   // Temporarily accept both old and new secrets
   JWT_SECRET=<new_secret>
   JWT_SECRET_OLD=<old_secret>
   ```
2. **Update auth middleware**:
   ```javascript
   try {
     return jwt.verify(token, process.env.JWT_SECRET);
   } catch {
     return jwt.verify(token, process.env.JWT_SECRET_OLD);
   }
   ```
3. **Deploy updated secret**: Update environment variables across all instances
4. **Monitor for errors**: Check logs for verification failures
5. **Remove old secret**: After 24-48 hours, remove `JWT_SECRET_OLD`

### Database Credentials Rotation (Every 90 Days)

1. **Create new database user**:
   ```javascript
   db.createUser({
     user: "bims_app_v2",
     pwd: "<new_password>",
     roles: [{ role: "readWrite", db: "bims_db" }]
   })
   ```
2. **Update application config**: Add new credentials to environment
3. **Test connection**: Verify app can connect with new credentials
4. **Switch to new user**: Update `MONGODB_URI` in production
5. **Monitor**: Ensure no connection errors
6. **Revoke old user**: After 24 hours:
   ```javascript
   db.dropUser("bims_app_v1")
   ```

### API Keys & Third-Party Secrets (As Needed)

1. **Email service (Nodemailer)**:
   - Generate new app password in email provider
   - Update `EMAIL_PASSWORD` in environment
   - Test sending email
   - Revoke old password

2. **reCAPTCHA keys** (if compromised):
   - Generate new site and secret keys in Google Console
   - Update frontend and backend simultaneously
   - Update `RECAPTCHA_SECRET_KEY`

3. **Blockchain credentials**:
   - Regenerate Fabric Network certificates
   - Update `connection-org1.json`
   - Re-enroll admin identities

---

## Automated Rotation Reminder Script

Create a cron job or scheduled task:

```bash
#!/bin/bash
# secret-rotation-reminder.sh
# Run monthly to check secret ages

ROTATION_INTERVAL_DAYS=90
CURRENT_DATE=$(date +%s)

# Check JWT secret age (example using file timestamp)
JWT_LAST_ROTATION=$(stat -c %Y /path/to/jwt-secret-rotation.txt)
JWT_AGE_DAYS=$(( ($CURRENT_DATE - $JWT_LAST_ROTATION) / 86400 ))

if [ $JWT_AGE_DAYS -gt $ROTATION_INTERVAL_DAYS ]; then
  echo "⚠️ JWT secret is $JWT_AGE_DAYS days old - ROTATION REQUIRED"
  # Send alert email
  echo "JWT secret rotation overdue" | mail -s "Security Alert" admin@example.com
fi

# Similar checks for other secrets...
```

Add to crontab:
```bash
# Run on the 1st of every month at 9 AM
0 9 1 * * /path/to/secret-rotation-reminder.sh
```

---

## Security Checklist for Deployment

### Pre-Production
- [ ] All environment variables set (no hardcoded secrets)
- [ ] HTTPS enforced (valid SSL/TLS certificate)
- [ ] Database backups configured (daily, retained 30 days)
- [ ] Rate limiting tested and tuned
- [ ] CAPTCHA enabled on auth endpoints
- [ ] Security headers verified (helmet configuration)
- [ ] Audit logging enabled and tested
- [ ] Metrics endpoint secured (admin-only)
- [ ] File upload limits and validation active
- [ ] Socket.IO rate limiting configured

### Post-Deployment
- [ ] Security scan passed (OWASP ZAP baseline)
- [ ] Dependency vulnerabilities resolved (npm audit clean)
- [ ] Monitoring alerts configured (failed logins, rate limits)
- [ ] Incident response team identified
- [ ] Backup restoration tested
- [ ] Secret rotation schedule documented
- [ ] Security policy communicated to team

---

## Compliance & Best Practices

### Data Privacy (GDPR/CCPA)
- **Right to access**: Audit logs allow user data access tracking
- **Right to deletion**: Implement data deletion endpoints with audit trail
- **Consent management**: Store explicit consent for data collection
- **Data minimization**: Collect only necessary information
- **Encryption**: Passwords bcrypt-hashed, sensitive data encrypted at rest

### OWASP Top 10 Mitigations

| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | RLS middleware, role-based authorization |
| A02 Cryptographic Failures | bcrypt for passwords, HTTPS enforced |
| A03 Injection | Zod validation, sanitize-html, NoSQL sanitization |
| A04 Insecure Design | Security-first architecture, threat modeling |
| A05 Security Misconfiguration | Helmet headers, secure defaults |
| A06 Vulnerable Components | Dependabot, npm audit, weekly scans |
| A07 Auth Failures | Rate limiting, CAPTCHA, audit logging |
| A08 Software Integrity | Dependency lockfiles, signature verification |
| A09 Logging Failures | Comprehensive audit logging system |
| A10 SSRF | Input validation, URL allowlisting |

---

## Reporting Vulnerabilities

### Responsible Disclosure
If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. **Contact**: Use GitHub Security Advisory or email: security@latorrenorth.com
3. **Include**:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
4. **Response time**: We aim to respond within 48 hours
5. **Disclosure timeline**: We request 90 days before public disclosure

### Bug Bounty
We appreciate security researchers and may offer recognition for valid findings.

---

**Last Updated**: 2025-11-23  
**Version**: 2.0  
**Maintained By**: Security Team
