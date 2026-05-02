# OpenClaw Web Dev Stack - Setup Guide

## Quick Start

```bash
# 1. Setup Stripe CLI
bash setup-stripe-cli.sh

# 2. Pull best AI models
ollama pull qwen3:8b        # Main AI for complex tasks
ollama pull qwen2.5:7b      # Backup AI
ollama pull deepseek-r1:1.5b  # Quick tasks

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your keys
```

## Integrated Tools

### 1. AI Models (Ollama)
| Model | Use Case | Size |
|-------|----------|------|
| **Qwen3:8b** | Complex architecture, full app generation | 4.7 GB |
| **Qwen2.5:7b** | Frontend components, React/Vue | 4.2 GB |
| **DeepSeek-r1:1.5b** | Quick fixes, simple tasks | 1.1 GB |

**Start Ollama:**
```bash
ollama serve
```

### 2. Stripe CLI
```bash
# Login to Stripe
stripe login

# Start webhook listener (for local dev)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook
stripe trigger payment_intent.succeeded

# Open dashboard
stripe open
```

### 3. Supabase CLI
```bash
# Check status
supabase status

# Generate TypeScript types
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts

# Deploy edge functions
supabase functions deploy
```

### 4. Next.js
```bash
# Create new project
npx create-next-app@latest bodulica-shop --typescript --tailwind --eslint

# Or use existing
cd bodulica-shop
npm install @supabase/supabase-js @stripe/stripe-js
```

## OpenClaw Commands

```bash
# AI Code Generation
python3 openclaw_integration/skills/web-development/skill.py ai-generate "Create a product card component with Stripe buy button" qwen3:8b

# Check Stripe Status
python3 openclaw_integration/skills/web-development/skill.py stripe-check

# Check Supabase
python3 openclaw_integration/skills/web-development/skill.py supabase-check

# Build Project
python3 openclaw_integration/skills/web-development/skill.py build ./bodulica-shop

# Deploy
python3 openclaw_integration/skills/web-development/skill.py deploy ./bodulica-shop

# Health Check
python3 openclaw_integration/skills/web-development/skill.py health https://bodulica.shop
```

## Development Workflow

### Start Dev Environment
```bash
# Terminal 1: Stripe Webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 2: Next.js Dev Server
npm run dev
```

### Deploy Flow
```bash
# 1. Build and test
npm run build
npm run test

# 2. Push to deploy (triggers GitHub Actions → Cloudflare)
git add -A
git commit -m "Deploy updates"
git push origin main

# 3. Sync Supabase (if DB changes)
supabase db push
supabase functions deploy
```

## Environment Variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# DeepSeek API (optional, free tier)
DEEPSEEK_API_KEY=sk-...

# Cloudflare (for API access)
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

## Troubleshooting

### Stripe CLI not found
```bash
# Re-run setup
bash setup-stripe-cli.sh

# Or install manually
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
```

### Ollama not running
```bash
# Start Ollama server
ollama serve

# Pull models
ollama pull qwen3:8b
```

### Supabase CLI issues
```bash
# Update CLI
npm install -g supabase@latest

# Or
brew upgrade supabase
```

## Full Stack Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 14    │────▶│  Cloudflare     │────▶│   bodulica.shop │
│   React + TS    │     │  Pages (CDN)    │     │   (Production)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Supabase      │◀───▶│   Stripe        │
│  (Auth, DB)     │     │  (Payments)     │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  OpenClaw + AI  │
│  (Qwen3/DeepSeek)│
└─────────────────┘
```

## Next Steps

1. ✅ Install Stripe CLI
2. ✅ Pull AI models
3. ✅ Setup environment variables
4. ➡️ Create Next.js project
5. ➡️ Setup Supabase schema
6. ➡️ Integrate Stripe payments
7. ➡️ Deploy to Cloudflare

Need help? Run:
```bash
python3 openclaw_integration/skills/web-development/skill.py --help
```
