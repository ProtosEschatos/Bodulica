---
name: railway-deployment
autonomous: true
trigger:
  - scheduled (every 30 minutes)
  - command ("deploy railway", "redeploy", "update railway")
  - webhook (github push to main)
description: Monitors and auto-deploys to Railway when code changes or issues detected
requires:
  env:
    - RAILWAY_TOKEN
    - RAILWAY_SERVICE_ID
    - GITHUB_TOKEN
  bins:
    - curl
    - jq
    - git
    - npm
---

# 🤖 Railway Auto-Deployment Skill

## Auto-Deploy on GitHub Push
```bash
#!/bin/bash
set -e

# Check if Railway is running latest code
HEALTH_URL="https://cosmic-blueprint-production.up.railway.app/health"
CURRENT_SERVICE=$(curl -s "$HEALTH_URL" | jq -r '.service' 2>/dev/null)

echo "Current Railway service: $CURRENT_SERVICE"

if [ "$CURRENT_SERVICE" = "stripe-webhook" ]; then
  echo "⚠️ Railway still running OLD code (stripe-webhook)"
  echo "🚀 Triggering deployment..."
  
  # Deploy via Railway CLI
  npm install -g @railway/cli
  export RAILWAY_TOKEN="$RAILWAY_TOKEN"
  railway link --service "$RAILWAY_SERVICE_ID"
  railway up --detach
  
  # Wait and verify
  sleep 60
  NEW_SERVICE=$(curl -s "$HEALTH_URL" | jq -r '.service' 2>/dev/null)
  
  if [ "$NEW_SERVICE" = "ai-server" ]; then
    echo "✅ Railway deployed AI server successfully!"
    # Notify via Telegram if configured
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$ADMIN_CHAT_ID" \
        -d "text=🚀 Railway AI Server deployed successfully!" || true
    fi
  else
    echo "❌ Deployment failed - still showing: $NEW_SERVICE"
  fi
else
  echo "✅ Railway already running latest code: $CURRENT_SERVICE"
fi
```

## Manual Deploy Command
```bash
#!/bin/bash
# Usage: openclaw deploy railway

export RAILWAY_TOKEN="$RAILWAY_TOKEN"
npm install -g @railway/cli
railway link --service "$RAILWAY_SERVICE_ID"
railway up --detach

echo "✅ Manual Railway deployment triggered"
```

## Health Check & Auto-Restart
```bash
#!/bin/bash
# Check every 30 minutes

HEALTH_URL="https://cosmic-blueprint-production.up.railway.app/health"
HEALTH_STATUS=$(curl -s "$HEALTH_URL" | jq -r '.status' 2>/dev/null)

if [ "$HEALTH_STATUS" != "healthy" ]; then
  echo "⚠️ Railway health check failed - redeploying..."
  
  export RAILWAY_TOKEN="$RAILWAY_TOKEN"
  npm install -g @railway/cli
  railway link --service "$RAILWAY_SERVICE_ID"
  railway up --detach
  
  # Log the incident
  echo "[$(date)] Auto-redeploy triggered due to health check failure" >> /tmp/openclaw-railway.log
fi
```
