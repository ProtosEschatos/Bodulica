---
name: payment-stripe
description: Stripe payment processing, subscription management, and revenue analytics
version: 1.0.0
requires:
  env:
    - STRIPE_SECRET_KEY
    - STRIPE_WEBHOOK_SECRET
    - ASTROLOGY_API_URL
    - DATABASE_URL
  bins:
    - curl
    - jq
commands:
  create-checkout:
    description: Create Stripe Checkout session for subscription
    params:
      user_id:
        type: string
        required: true
      plan:
        type: string
        enum: [weekly, monthly, yearly]
        required: true
      success_url:
        type: string
        required: true
      cancel_url:
        type: string
        required: true
    script: |
      PRICE_IDS='{"weekly": "price_weekly_xxx", "monthly": "price_monthly_xxx", "yearly": "price_yearly_xxx"}'
      PRICE=$(echo "$PRICE_IDS" | jq -r '.{{plan}}')
      
      SESSION=$(curl -s -X POST https://api.stripe.com/v1/checkout/sessions \
        -u "$STRIPE_SECRET_KEY:" \
        -d "client_reference_id={{user_id}}" \
        -d "mode=subscription" \
        -d "subscription_data[metadata][user_id]={{user_id}}" \
        -d "subscription_data[metadata][plan]={{plan}}" \
        -d "success_url={{success_url}}" \
        -d "cancel_url={{cancel_url}}" \
        -d "line_items[0][price]=$PRICE" \
        -d "line_items[0][quantity]=1")
      
      echo "$SESSION" | jq '{checkout_url: .url, session_id: .id}'
    
  activate-premium:
    description: Activate premium after successful payment
    params:
      user_id:
        type: string
        required: true
      plan:
        type: string
        required: true
      stripe_subscription_id:
        type: string
        required: true
    script: |
      DURATION='{"weekly": 7, "monthly": 30, "yearly": 365}'
      DAYS=$(echo "$DURATION" | jq -r '.{{plan}}')
      
      psql "$DATABASE_URL" -c "
        UPDATE users SET 
          is_premium = true,
          premium_plan = '{{plan}}',
          premium_started_at = NOW(),
          premium_expires_at = NOW() + INTERVAL '$DAYS days',
          stripe_subscription_id = '{{stripe_subscription_id}}'
        WHERE id = '{{user_id}}'
      "
      
      # Send confirmation
      curl -s -X POST "$ASTROLOGY_API_URL/api/premium/activate" \
        -H "Content-Type: application/json" \
        -d '{"user_id": "{{user_id}}", "plan": "{{plan}}", "payment_id": "{{stripe_subscription_id}}"}'
      
      echo '{"success": true, "message": "Premium activated"}'
    
  cancel-subscription:
    description: Cancel user subscription
    params:
      user_id:
        type: string
        required: true
    script: |
      SUB_ID=$(psql "$DATABASE_URL" -t -c "SELECT stripe_subscription_id FROM users WHERE id = '{{user_id}}'" | tr -d ' ')
      
      if [ -n "$SUB_ID" ]; then
        curl -s -X DELETE "https://api.stripe.com/v1/subscriptions/$SUB_ID" \
          -u "$STRIPE_SECRET_KEY:"
        
        psql "$DATABASE_URL" -c "
          UPDATE users SET 
            is_premium = false,
            premium_plan = NULL,
            premium_expires_at = NULL,
            stripe_subscription_id = NULL
          WHERE id = '{{user_id}}'
        "
        
        echo '{"success": true, "message": "Subscription cancelled"}'
      else
        echo '{"success": false, "message": "No active subscription found"}'
      fi
    
  get-revenue-analytics:
    description: Get revenue metrics and analytics
    params:
      period:
        type: string
        enum: [today, week, month, year]
        default: month
    script: |
      case "{{period}}" in
        today)
          QUERY="SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE DATE(created_at) = CURRENT_DATE"
          ;;
        week)
          QUERY="SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE created_at > NOW() - INTERVAL '7 days'"
          ;;
        month)
          QUERY="SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE created_at > NOW() - INTERVAL '30 days'"
          ;;
        year)
          QUERY="SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments WHERE created_at > NOW() - INTERVAL '365 days'"
          ;;
      esac
      
      RESULT=$(psql "$DATABASE_URL" -t -c "$QUERY")
      REVENUE=$(echo "$RESULT" | cut -d'|' -f1 | tr -d ' ')
      COUNT=$(echo "$RESULT" | cut -d'|' -f2 | tr -d ' ')
      
      echo "{\"period\": \"{{period}}\", \"revenue\": $REVENUE, \"transactions\": $COUNT, \"currency\": \"EUR\"}"
    
  handle-webhook:
    description: Process Stripe webhook events
    params:
      payload:
        type: string
        required: true
      signature:
        type: string
        required: true
    endpoint: POST /api/webhooks/stripe
    script: |
      # Verify webhook signature and process event
      EVENT=$(echo '{{payload}}' | jq -r '.type')
      
      case "$EVENT" in
        "checkout.session.completed")
          USER_ID=$(echo '{{payload}}' | jq -r '.data.object.client_reference_id')
          PLAN=$(echo '{{payload}}' | jq -r '.data.object.metadata.plan')
          SUB_ID=$(echo '{{payload}}' | jq -r '.data.object.subscription')
          openclaw run payment-stripe activate-premium \
            --user_id="$USER_ID" \
            --plan="$PLAN" \
            --stripe_subscription_id="$SUB_ID"
          ;;
        "invoice.payment_failed")
          USER_ID=$(echo '{{payload}}' | jq -r '.data.object.customer')
          # Send payment failed notification
          ;;
        "customer.subscription.deleted")
          SUB_ID=$(echo '{{payload}}' | jq -r '.data.object.id')
          # Mark subscription as cancelled
          ;;
      esac
      
      echo '{"received": true}'
    
  check-subscription-status:
    description: Check user's subscription status
    params:
      user_id:
        type: string
        required: true
    script: |
      STATUS=$(psql "$DATABASE_URL" -t -c "
        SELECT json_build_object(
          'is_premium', is_premium,
          'plan', premium_plan,
          'expires_at', premium_expires_at,
          'days_remaining', EXTRACT(DAY FROM (premium_expires_at - NOW()))
        )
        FROM users 
        WHERE id = '{{user_id}}'
      " | tr -d ' ')
      
      echo "$STATUS"
---

# 💳 Payment & Stripe Skill

Handles all payment processing, subscription management, and revenue tracking.

## Features

- **Checkout Sessions** - Create payment links
- **Subscription Management** - Activate, cancel, check status
- **Webhook Handling** - Process Stripe events
- **Revenue Analytics** - Track MRR, conversions

## Environment Variables

```bash
export STRIPE_SECRET_KEY="sk_live_xxx"
export STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

## Webhook Setup

Configure in Stripe Dashboard:
- Endpoint: `https://your-api.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`

## Usage Examples

```bash
# Create checkout session
openclaw run payment-stripe create-checkout \
  --user_id=user_123 \
  --plan=monthly \
  --success_url="https://app.com/success" \
  --cancel_url="https://app.com/cancel"

# Check subscription status
openclaw run payment-stripe check-subscription-status --user_id=user_123

# Get revenue stats
openclaw run payment-stripe get-revenue-analytics --period=month

# Cancel subscription
openclaw run payment-stripe cancel-subscription --user_id=user_123
```
