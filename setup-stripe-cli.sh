#!/bin/bash
# Stripe CLI Setup Script for Bodulica

set -e

echo "💳 Stripe CLI Setup for Bodulica Shop"
echo "======================================"

# Check if already installed
if command -v stripe &> /dev/null; then
    echo "✅ Stripe CLI already installed:"
    stripe --version
    echo ""
    echo "To login to Stripe, run:"
    echo "  stripe login"
    exit 0
fi

echo "📦 Installing Stripe CLI..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt &> /dev/null; then
        # Debian/Ubuntu
        echo "Detected: Debian/Ubuntu"
        curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
        echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
        sudo apt update
        sudo apt install -y stripe
    elif command -v yum &> /dev/null; then
        # RedHat/CentOS
        echo "Detected: RedHat/CentOS"
        curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
        echo "[stripe-cli]\nname=Stripe CLI\nbaseurl=https://packages.stripe.dev/stripe-cli-rpm-local/\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public" | sudo tee /etc/yum.repos.d/stripe-cli.repo
        sudo yum install -y stripe
    else
        # Generic Linux - use binary
        echo "Installing from binary..."
        wget -q https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz -O /tmp/stripe.tar.gz
        tar -xzf /tmp/stripe.tar.gz -C /tmp
        sudo mv /tmp/stripe /usr/local/bin/
        rm /tmp/stripe.tar.gz
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        echo "Detected: macOS with Homebrew"
        brew install stripe/stripe-cli/stripe
    else
        echo "Please install Homebrew first: https://brew.sh"
        exit 1
    fi
else
    echo "Unsupported OS. Please install manually: https://stripe.com/docs/stripe-cli"
    exit 1
fi

echo ""
echo "✅ Stripe CLI installed!"
stripe --version
echo ""
echo "🔐 Next step - Login to Stripe:"
echo "  stripe login"
echo ""
echo "📚 Useful commands:"
echo "  stripe open                    # Open Stripe Dashboard"
echo "  stripe listen                  # Listen for webhooks locally"
echo "  stripe trigger payment_intent.succeeded  # Test webhook"
echo ""
echo "🎯 For Bodulica shop, run:"
echo "  stripe listen --forward-to localhost:3000/api/webhooks/stripe"
