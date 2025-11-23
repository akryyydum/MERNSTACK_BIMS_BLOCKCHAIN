#!/bin/bash

# Secret Rotation Reminder Script
# Run this monthly to check if secrets need rotation

# Configuration
ROTATION_INTERVAL_DAYS=90
ALERT_THRESHOLD_DAYS=7
SECRETS_LOG_FILE="/var/log/secret-rotations.log"
ALERT_EMAIL="admin@example.com"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Create log file if it doesn't exist
touch "$SECRETS_LOG_FILE" 2>/dev/null || SECRETS_LOG_FILE="/tmp/secret-rotations.log"

# Function to check secret age
check_secret_age() {
    local secret_name=$1
    local last_rotation_key="${secret_name}_LAST_ROTATION"
    local last_rotation_date=$(grep "^$last_rotation_key=" "$SECRETS_LOG_FILE" 2>/dev/null | cut -d'=' -f2)
    
    if [ -z "$last_rotation_date" ]; then
        echo -e "${YELLOW}⚠️  $secret_name: No rotation date recorded${NC}"
        echo "   Action: Initialize rotation tracking by running:"
        echo "   echo '${last_rotation_key}=$(date +%s)' >> $SECRETS_LOG_FILE"
        return 1
    fi
    
    local current_date=$(date +%s)
    local age_seconds=$((current_date - last_rotation_date))
    local age_days=$((age_seconds / 86400))
    local days_until_rotation=$((ROTATION_INTERVAL_DAYS - age_days))
    
    if [ $age_days -gt $ROTATION_INTERVAL_DAYS ]; then
        echo -e "${RED}🚨 $secret_name: OVERDUE by $((age_days - ROTATION_INTERVAL_DAYS)) days${NC}"
        echo "   Age: $age_days days"
        echo "   Action Required: ROTATE IMMEDIATELY"
        return 2
    elif [ $days_until_rotation -le $ALERT_THRESHOLD_DAYS ]; then
        echo -e "${YELLOW}⚠️  $secret_name: Rotation needed in $days_until_rotation days${NC}"
        echo "   Age: $age_days days"
        echo "   Action: Schedule rotation soon"
        return 1
    else
        echo -e "${GREEN}✅ $secret_name: OK (rotated $age_days days ago)${NC}"
        echo "   Next rotation in: $days_until_rotation days"
        return 0
    fi
}

# Function to record rotation
record_rotation() {
    local secret_name=$1
    local last_rotation_key="${secret_name}_LAST_ROTATION"
    
    # Remove old entry
    grep -v "^$last_rotation_key=" "$SECRETS_LOG_FILE" > "${SECRETS_LOG_FILE}.tmp" 2>/dev/null
    mv "${SECRETS_LOG_FILE}.tmp" "$SECRETS_LOG_FILE" 2>/dev/null
    
    # Add new entry
    echo "${last_rotation_key}=$(date +%s)" >> "$SECRETS_LOG_FILE"
    echo -e "${GREEN}✅ Recorded rotation for $secret_name${NC}"
}

# Function to generate secure secret
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d '\n'
}

# Main script
echo "=================================================="
echo "     Secret Rotation Check"
echo "     $(date)"
echo "=================================================="
echo ""

# Check all secrets
NEEDS_ATTENTION=0

echo "Checking JWT_SECRET..."
check_secret_age "JWT_SECRET"
[ $? -ne 0 ] && NEEDS_ATTENTION=1
echo ""

echo "Checking JWT_REFRESH_SECRET..."
check_secret_age "JWT_REFRESH_SECRET"
[ $? -ne 0 ] && NEEDS_ATTENTION=1
echo ""

echo "Checking DATABASE_PASSWORD..."
check_secret_age "DATABASE_PASSWORD"
[ $? -ne 0 ] && NEEDS_ATTENTION=1
echo ""

echo "Checking SESSION_SECRET..."
check_secret_age "SESSION_SECRET"
[ $? -ne 0 ] && NEEDS_ATTENTION=1
echo ""

echo "Checking EMAIL_PASSWORD..."
check_secret_age "EMAIL_PASSWORD"
[ $? -ne 0 ] && NEEDS_ATTENTION=1
echo ""

echo "Checking RECAPTCHA_SECRET_KEY..."
check_secret_age "RECAPTCHA_SECRET_KEY"
[ $? -ne 0 ] && NEEDS_ATTENTION=1
echo ""

# Summary
echo "=================================================="
if [ $NEEDS_ATTENTION -eq 0 ]; then
    echo -e "${GREEN}All secrets are up to date!${NC}"
else
    echo -e "${YELLOW}Some secrets need attention. Review above.${NC}"
    
    # Send email alert if configured
    if command -v mail &> /dev/null && [ -n "$ALERT_EMAIL" ]; then
        echo "Secrets need rotation" | mail -s "⚠️ Secret Rotation Alert - BIMS System" "$ALERT_EMAIL"
    fi
fi
echo "=================================================="
echo ""

# Interactive mode
if [ "$1" == "--interactive" ] || [ "$1" == "-i" ]; then
    echo "Interactive Mode"
    echo "=================================================="
    echo ""
    
    read -p "Do you want to record a secret rotation? (y/n): " record_choice
    if [ "$record_choice" == "y" ] || [ "$record_choice" == "Y" ]; then
        echo ""
        echo "Available secrets:"
        echo "1. JWT_SECRET"
        echo "2. JWT_REFRESH_SECRET"
        echo "3. DATABASE_PASSWORD"
        echo "4. SESSION_SECRET"
        echo "5. EMAIL_PASSWORD"
        echo "6. RECAPTCHA_SECRET_KEY"
        echo ""
        read -p "Select secret number (1-6): " secret_num
        
        case $secret_num in
            1) record_rotation "JWT_SECRET" ;;
            2) record_rotation "JWT_REFRESH_SECRET" ;;
            3) record_rotation "DATABASE_PASSWORD" ;;
            4) record_rotation "SESSION_SECRET" ;;
            5) record_rotation "EMAIL_PASSWORD" ;;
            6) record_rotation "RECAPTCHA_SECRET_KEY" ;;
            *) echo "Invalid selection" ;;
        esac
    fi
    
    echo ""
    read -p "Do you want to generate a new secret? (y/n): " gen_choice
    if [ "$gen_choice" == "y" ] || [ "$gen_choice" == "Y" ]; then
        echo ""
        read -p "Enter desired length (default 64): " length
        length=${length:-64}
        echo ""
        echo "New secret (copy this):"
        echo "----------------------------------------"
        generate_secret $length
        echo ""
        echo "----------------------------------------"
        echo ""
        echo "⚠️  Remember to:"
        echo "1. Update your .env file"
        echo "2. Restart the application"
        echo "3. Record the rotation with this script"
    fi
fi

# Rotation instructions
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo ""
    echo "Secret Rotation Script - Help"
    echo "=================================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -i, --interactive   Run in interactive mode"
    echo "  --record SECRET     Record rotation for SECRET"
    echo "  --generate [LENGTH] Generate new secret"
    echo ""
    echo "Examples:"
    echo "  $0                           # Check all secrets"
    echo "  $0 -i                        # Interactive mode"
    echo "  $0 --record JWT_SECRET       # Record JWT_SECRET rotation"
    echo "  $0 --generate 64             # Generate 64-char secret"
    echo ""
    echo "Setup Cron Job:"
    echo "  # Run on 1st of every month at 9 AM"
    echo "  0 9 1 * * /path/to/check-secret-rotation.sh"
    echo ""
fi

# Handle command line arguments
if [ "$1" == "--record" ] && [ -n "$2" ]; then
    record_rotation "$2"
fi

if [ "$1" == "--generate" ]; then
    length=${2:-64}
    generate_secret $length
    echo ""
fi

exit $NEEDS_ATTENTION
