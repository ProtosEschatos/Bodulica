#!/bin/bash

# OpenClaw Astrology App Integration Installer
# This script sets up the OpenClaw skill for Astro Insights app

set -e

echo "🦞 OpenClaw Astrology App Integration Setup"
echo "=========================================="

# Check if OpenClaw is installed
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw is not installed. Installing now..."
    npm install -g openclaw@latest
    echo "✅ OpenClaw installed successfully"
else
    echo "✅ OpenClaw is already installed"
fi

# Create skills directory
echo "📁 Creating OpenClaw skills directory..."
mkdir -p ~/.openclaw/skills/astrology-app

# Copy skill file
echo "📋 Installing astrology skill..."
cp "$(dirname "$0")/astrology-app/SKILL.md" ~/.openclaw/skills/astrology-app/

# Check if OpenClaw is running
if openclaw status &> /dev/null; then
    echo "🔄 Restarting OpenClaw to load new skill..."
    openclaw restart
else
    echo "🚀 Starting OpenClaw..."
    openclaw start
fi

# Prompt for configuration
echo ""
echo "⚙️  Configuration Required"
echo "========================="
echo "Please set the following environment variables in ~/.openclaw/openclaw.json:"
echo ""
echo "{"
echo "  \"env\": {"
echo "    \"ASTROLOGY_API_URL\": \"https://your-backend-url.com\","
echo "    \"ASTROLOGY_API_KEY\": \"your-api-key-here\""
echo "  }"
echo "}"
echo ""
echo "📖 For detailed setup instructions, see: openclaw_integration/README.md"
echo ""
echo "✅ Installation complete! The astrology skill is now available in OpenClaw."
