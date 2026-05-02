---
name: notifications-bot
description: Multi-channel messaging for Telegram, WhatsApp, Discord, and push notifications
version: 1.0.0
requires:
  env:
    - TELEGRAM_BOT_TOKEN
    - WHATSAPP_API_KEY
    - DISCORD_BOT_TOKEN
    - FIREBASE_SERVER_KEY
    - ASTROLOGY_API_URL
  bins:
    - curl
    - jq
commands:
  telegram-send:
    description: Send message via Telegram bot
    params:
      chat_id:
        type: string
        required: true
      message:
        type: string
        required: true
      parse_mode:
        type: string
        default: Markdown
        enum: [Markdown, HTML]
    script: |
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id={{chat_id}}" \
        -d "text={{message}}" \
        -d "parse_mode={{parse_mode}}"
    
  telegram-broadcast:
    description: Send message to all subscribed users
    params:
      message:
        type: string
        required: true
      filter_premium:
        type: boolean
        default: false
    endpoint: POST /api/notifications/broadcast
    
  whatsapp-send:
    description: Send WhatsApp message (requires Business API)
    params:
      phone:
        type: string
        required: true
      message:
        type: string
        required: true
    script: |
      curl -s -X POST "https://graph.facebook.com/v18.0/me/messages" \
        -H "Authorization: Bearer $WHATSAPP_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
          \"messaging_product\": \"whatsapp\",
          \"recipient_type\": \"individual\",
          \"to\": \"{{phone}}\",
          \"type\": \"text\",
          \"text\": { \"body\": \"{{message}}\" }
        }"
    
  push-send:
    description: Send Firebase push notification
    params:
      token:
        type: string
        required: true
      title:
        type: string
        required: true
      body:
        type: string
        required: true
      data:
        type: object
    script: |
      curl -s -X POST "https://fcm.googleapis.com/fcm/send" \
        -H "Authorization: key=$FIREBASE_SERVER_KEY" \
        -H "Content-Type: application/json" \
        -d "{
          \"to\": \"{{token}}\",
          \"notification\": {
            \"title\": \"{{title}}\",
            \"body\": \"{{body}}\"
          },
          \"data\": {{data}}
        }"
    
  daily-horoscope-blast:
    description: Send daily horoscopes to all subscribed users
    params:
      test_mode:
        type: boolean
        default: false
    schedule: daily at 08:00
    script: |
      #!/bin/bash
      # Fetch users with daily notifications enabled
      USERS=$(psql "$DATABASE_URL" -t -c "
        SELECT id, zodiac_sign, telegram_chat_id, notification_time, language 
        FROM users 
        WHERE daily_horoscope_enabled = true 
        AND notification_time = '08:00'
      " 2>/dev/null)
      
      for USER in $USERS; do
        IFS='|' read -r ID SIGN CHAT_ID TIME LANG <<< "$USER"
        
        # Get horoscope
        HOROSCOPE=$(curl -s -X POST "$ASTROLOGY_API_URL/api/daily-horoscope" \
          -H "Content-Type: application/json" \
          -d "{\"zodiac_sign\": \"$SIGN\", \"language\": \"$LANG\"}" | jq -r '.data.horoscope')
        
        # Send via Telegram
        if [ -n "$CHAT_ID" ] && [ "{{test_mode}}" = "false" ]; then
          curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$CHAT_ID" \
            -d "parse_mode=Markdown" \
            -d "text=🔮 *Daily Horoscope for $SIGN*\n\n$HOROSCOPE" 2>/dev/null
        fi
      done
      
      echo "✅ Daily horoscopes sent"
    
  subscribe-user:
    description: Subscribe user to notifications
    params:
      user_id:
        type: string
        required: true
      zodiac_sign:
        type: string
        required: true
      telegram_chat_id:
        type: string
      notification_time:
        type: string
        default: 08:00
      language:
        type: string
        default: en
    endpoint: POST /api/notifications/subscribe
    
  unsubscribe-user:
    description: Unsubscribe user from notifications
    params:
      user_id:
        type: string
        required: true
    endpoint: POST /api/notifications/unsubscribe
---

# 📱 Notifications & Bot Skill

Handles all messaging channels for the astrology app.

## Supported Channels

- **Telegram Bot** - Primary messaging platform
- **WhatsApp Business** - For premium users
- **Firebase Push** - Mobile app notifications
- **Discord** - Community features

## Scheduled Tasks

- **Daily at 8:00 AM**: Send horoscopes to all subscribed users

## Usage Examples

```bash
# Send Telegram message
openclaw run notifications-bot telegram-send \
  --chat_id=123456789 \
  --message="Your daily horoscope is ready!"

# Subscribe user
openclaw run notifications-bot subscribe-user \
  --user_id=user_123 \
  --zodiac_sign=aries \
  --telegram_chat_id=123456789

# Send daily horoscopes manually
openclaw run notifications-bot daily-horoscope-blast
```
