#!/usr/bin/env bash
# Pre-deployment validation for production environment
# Run this script before building for production to catch placeholder values

set -euo pipefail

ENV_FILE=".env.production"
ERRORS=0

echo "=== Production Environment Validation ==="

# Check for example.com placeholder
if grep -q "example\.com" "$ENV_FILE" 2>/dev/null; then
    echo "[ERROR] VITE_API_BASE_URL still contains example.com placeholder"
    ERRORS=$((ERRORS + 1))
fi

# Check for placeholder token crypto key
if grep -q "__PLACEHOLDER__" "$ENV_FILE" 2>/dev/null; then
    echo "[ERROR] VITE_TOKEN_CRYPTO_KEY still contains __PLACEHOLDER__"
    ERRORS=$((ERRORS + 1))
fi

# Validate token crypto key length (must be >= 16 chars)
CRYPTO_KEY=$(grep "^VITE_TOKEN_CRYPTO_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || true)
if [ ${#CRYPTO_KEY} -lt 16 ]; then
    echo "[ERROR] VITE_TOKEN_CRYPTO_KEY must be at least 16 characters (current: ${#CRYPTO_KEY})"
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "=== VALIDATION FAILED: $ERRORS error(s) found ==="
    echo "Fix the issues above before deploying to production."
    exit 1
fi

echo "[OK] All production environment checks passed"
