#!/bin/bash

# MERN Stack BIMS Security Integration Setup
# Run this script to complete the security setup

set -e  # Exit on error

echo "=================================================="
echo "  BIMS Security Integration Setup"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the 'back' directory"
    exit 1
fi

echo "📦 Step 1: Installing new dependencies..."
echo "   - zod (validation)"
echo "   - sanitize-html (XSS protection)"
echo "   - mime-types (file validation)"
echo "   - prom-client (metrics)"
echo ""

npm install zod@^3.22.4 sanitize-html@^2.11.0 mime-types@^2.1.35 prom-client@^15.1.0

echo ""
echo "✅ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Step 2: Creating .env file..."
    cp .env.example .env
    echo "✅ .env created from template"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and update the following:"
    echo "   - JWT_SECRET (generate with: npm run security:generate-secret)"
    echo "   - JWT_REFRESH_SECRET (generate with: npm run security:generate-secret)"
    echo "   - MONGODB_URI"
    echo "   - EMAIL_* settings"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Generate secrets
echo "🔐 Step 3: Generating secure secrets..."
echo ""
echo "JWT_SECRET (copy this to your .env file):"
echo "----------------------------------------"
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
echo "----------------------------------------"
echo ""
echo "JWT_REFRESH_SECRET (copy this to your .env file):"
echo "----------------------------------------"
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
echo "----------------------------------------"
echo ""

# Initialize secret rotation tracking
echo "📅 Step 4: Initializing secret rotation tracking..."
SECRETS_LOG="/var/log/secret-rotations.log"
if [ ! -w "/var/log" ]; then
    SECRETS_LOG="/tmp/secret-rotations.log"
fi

CURRENT_TIME=$(date +%s)
cat > "$SECRETS_LOG" << EOF
# Secret Rotation Tracking
# Format: SECRET_NAME_LAST_ROTATION=timestamp
JWT_SECRET_LAST_ROTATION=$CURRENT_TIME
JWT_REFRESH_SECRET_LAST_ROTATION=$CURRENT_TIME
DATABASE_PASSWORD_LAST_ROTATION=$CURRENT_TIME
SESSION_SECRET_LAST_ROTATION=$CURRENT_TIME
EMAIL_PASSWORD_LAST_ROTATION=$CURRENT_TIME
RECAPTCHA_SECRET_KEY_LAST_ROTATION=$CURRENT_TIME
EOF

echo "✅ Secret rotation tracking initialized at: $SECRETS_LOG"
echo ""

# Run security audit
echo "🔍 Step 5: Running security audit..."
echo ""
npm audit --omit=dev || echo "⚠️  Some vulnerabilities found - review output above"
echo ""

# Make scripts executable
echo "🔧 Step 6: Making scripts executable..."
chmod +x scripts/check-secret-rotation.sh
echo "✅ Scripts are now executable"
echo ""

# Test configuration
echo "🧪 Step 7: Testing configuration..."
echo ""

# Check if required env vars are set (will be in .env after user edits)
echo "   Testing environment setup..."
if node -e "require('dotenv').config(); if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change_this')) { console.error('JWT_SECRET not set'); process.exit(1); }" 2>/dev/null; then
    echo "   ❌ JWT_SECRET needs to be updated in .env"
else
    echo "   Note: Remember to update JWT_SECRET in .env"
fi

echo ""
echo "=================================================="
echo "  ✅ Security Setup Complete!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit your .env file with the generated secrets above:"
echo "   nano .env"
echo ""
echo "2. Update the following environment variables:"
echo "   - JWT_SECRET"
echo "   - JWT_REFRESH_SECRET"
echo "   - MONGODB_URI"
echo "   - EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD"
echo ""
echo "3. (Optional) Setup CAPTCHA:"
echo "   - Get keys from: https://www.google.com/recaptcha/admin"
echo "   - Set RECAPTCHA_ENABLED=true in .env"
echo "   - Add RECAPTCHA_SECRET_KEY"
echo ""
echo "4. Start the server:"
echo "   npm start"
echo ""
echo "5. Run security checks:"
echo "   npm run security:check-secrets"
echo "   npm run security:audit"
echo ""
echo "6. (Optional) Setup cron job for secret rotation reminders:"
echo "   crontab -e"
echo "   Add: 0 9 1 * * $(pwd)/scripts/check-secret-rotation.sh"
echo ""
echo "📚 Documentation:"
echo "   - SECURITY.md - Security policy & procedures"
echo "   - SECURITY_IMPLEMENTATION.md - Implementation guide"
echo "   - SECURITY_QUICK_REFERENCE.md - Quick commands"
echo "   - SECURITY_INTEGRATION_SUMMARY.md - Complete summary"
echo ""
echo "⚠️  Important: Never commit .env to version control!"
echo ""
echo "=================================================="
