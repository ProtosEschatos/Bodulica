#!/bin/bash
# Setup complete dev stack for Bodulica shop

set -e

echo "🦞 Setting up Bodulica Dev Stack"
echo "================================"

# 1. Stripe CLI (za payments)
if ! command -v stripe &> /dev/null; then
echo "📦 Installing Stripe CLI..."
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install -y stripe
fi

# 2. Qwen3 model (najbolji za kod)
echo "🤖 Pulling Qwen3 8B (best for code generation)..."
ollama pull qwen3:8b || echo "Ollama not running, start with: ollama serve"

# 3. CodeLlama kao alternativa
echo "🤖 Pulling CodeLlama 7B (code-specific)..."
ollama pull codellama:7b || true

# 4. Install Next.js globally (optional)
echo "⚛️  Installing Next.js..."
npm install -g next@14.2.0 create-next-app@latest

# 5. Setup environment template
echo "📝 Creating environment template..."
cat > .env.local.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI (DeepSeek API - free tier)
DEEPSEEK_API_KEY=sk-...

# Cloudflare (ako trebaš API pristup)
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. cp .env.local.example .env.local"
echo "   2. Fill in your API keys"
echo "   3. npx create-next-app@latest bodulica-shop --typescript --tailwind --eslint"
echo "   4. cd bodulica-shop && npm install @supabase/supabase-js @stripe/stripe-js"
echo ""
echo "🤖 Available AI models:"
ollama list 2>/dev/null | grep -E "(qwen|deepseek|codellama)" || echo "   (Start ollama first: ollama serve)"
