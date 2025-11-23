# Security Practices

This document summarizes the active security measures implemented in this repository.

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

## 7. Next Steps / Hardening Roadmap
- Integrate `xss-clean` or DOMPurify server-side for HTML-bearing fields.
- Add validation schemas (e.g. Joi / Zod) for all endpoints.
- Refactor controllers to consistently use `req.applyRLS`.
- Implement audit logging & anomaly detection (e.g. repeated 401/429 events).
- Add WebSocket event rate limiting & auth reinforcement.

## 8. Reporting Vulnerabilities
Please open a private security advisory or email the maintainers. Do **not** create a public issue for sensitive disclosures.

---
Last updated: 2025-11-23
