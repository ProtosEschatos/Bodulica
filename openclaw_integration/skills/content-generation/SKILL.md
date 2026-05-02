---
name: content-generation
description: AI-powered content generation for horoscopes, social media, and marketing
version: 1.0.0
requires:
  env:
    - OLLAMA_HOST
    - OPENAI_API_KEY
  bins:
    - curl
    - jq
    - ollama
commands:
  generate-daily-horoscopes:
    description: Generate all 12 zodiac daily horoscopes using Ollama
    params:
      date:
        type: string
        format: date
        default: today
      language:
        type: string
        default: en
      model:
        type: string
        default: deepseek-r1:1.5b
    script: |
      #!/bin/bash
      SIGNS=("Aries" "Taurus" "Gemini" "Cancer" "Leo" "Virgo" "Libra" "Scorpio" "Sagittarius" "Capricorn" "Aquarius" "Pisces")
      DATE=$(date +%Y-%m-%d)
      
      echo "🔮 Generating daily horoscopes for $DATE..."
      
      for SIGN in "${SIGNS[@]}"; do
        PROMPT="Generate a daily horoscope for $SIGN for $DATE. Include: general outlook, love, career, health, and lucky number. Keep it under 200 words."
        
        HOROSCOPE=$(ollama run deepseek-r1:1.5b "$PROMPT" 2>/dev/null | head -c 500)
        
        # Save to database
        psql "$DATABASE_URL" -c "
          INSERT INTO daily_horoscopes (zodiac_sign, date, content, language, generated_at)
          VALUES ('$SIGN', '$DATE', '$(echo "$HOROSCOPE" | sed "s/'/''/g")', '{{language}}', NOW())
          ON CONFLICT (zodiac_sign, date) DO UPDATE SET content = EXCLUDED.content
        " 2>/dev/null
        
        echo "✅ $SIGN horoscope generated"
      done
      
      echo "🎉 All horoscopes generated and saved!"
    
  generate-social-post:
    description: Generate Instagram/Twitter post content
    params:
      zodiac_sign:
        type: string
        required: true
      topic:
        type: string
        enum: [daily, love, career, full_moon, new_moon, retrograde]
        default: daily
      platform:
        type: string
        enum: [instagram, twitter, facebook]
        default: instagram
    script: |
      #!/bin/bash
      PROMPT="Write an engaging {{platform}} post about {{topic}} for {{zodiac_sign}} zodiac sign. Include 3-5 relevant hashtags. Keep it under 280 characters for Twitter, or longer for Instagram."
      
      POST=$(ollama run deepseek-r1:1.5b "$PROMPT" 2>/dev/null)
      echo "{\"content\": \"$(echo "$POST" | sed 's/"/\\"/g')\", \"platform\": \"{{platform}}\", \"sign\": \"{{zodiac_sign}}\"}"
    
  generate-marketing-email:
    description: Generate marketing email content
    params:
      type:
        type: string
        enum: [welcome, weekly_digest, premium_promo, re_engagement]
        required: true
      target_sign:
        type: string
    script: |
      #!/bin/bash
      case "{{type}}" in
        welcome)
          SUBJECT="Welcome to Celestial Oracle 🌟"
          PROMPT="Write a warm welcome email for new astrology app users. Mention they can get daily horoscopes and natal chart analysis."
          ;;
        premium_promo)
          SUBJECT="Unlock Your Full Astrological Profile ✨"
          PROMPT="Write a promotional email encouraging users to upgrade to premium for natal charts and synastry analysis."
          ;;
        weekly_digest)
          SUBJECT="Your Weekly Cosmic Update 🌙"
          PROMPT="Write a weekly astrology digest with highlights for each zodiac sign."
          ;;
        re_engagement)
          SUBJECT="We Miss You! Come Back for Your Horoscope 💫"
          PROMPT="Write a friendly re-engagement email for users who haven't opened the app in 7+ days."
          ;;
      esac
      
      CONTENT=$(ollama run deepseek-r1:1.5b "$PROMPT" 2>/dev/null)
      echo "{\"subject\": \"$SUBJECT\", \"body\": \"$(echo "$CONTENT" | sed 's/"/\\"/g')\"}"
    
  generate-blog-article:
    description: Generate SEO-optimized blog article
    params:
      topic:
        type: string
        required: true
      keywords:
        type: array
        items: string
      word_count:
        type: integer
        default: 800
    script: |
      #!/bin/bash
      PROMPT="Write an SEO-optimized blog article about {{topic}}. 
      Keywords: {{keywords}}. 
      Target length: {{word_count}} words.
      Include: introduction, 3-4 main sections, conclusion.
      Make it informative and engaging for astrology enthusiasts."
      
      ARTICLE=$(ollama run deepseek-r1:1.5b "$PROMPT" 2>/dev/null)
      echo "{\"title\": \"{{topic}}\", \"content\": \"$(echo "$ARTICLE" | sed 's/"/\\"/g')\", \"keywords\": {{keywords}}}"
    
  batch-generate-content:
    description: Generate multiple content pieces at once
    params:
      content_types:
        type: array
        items: string
        enum: [horoscopes, social_posts, emails]
        required: true
      count:
        type: integer
        default: 12
    schedule: daily at 06:00
    script: |
      #!/bin/bash
      echo "🚀 Starting batch content generation..."
      
      for TYPE in {{content_types}}; do
        case "$TYPE" in
          "horoscopes")
            openclaw run content-generation generate-daily-horoscopes
            ;;
          "social_posts")
            SIGNS=("Aries" "Taurus" "Gemini" "Cancer" "Leo" "Virgo" "Libra" "Scorpio" "Sagittarius" "Capricorn" "Aquarius" "Pisces")
            for SIGN in "${SIGNS[@]}"; do
              openclaw run content-generation generate-social-post --zodiac_sign="$SIGN" --platform=instagram
            done
            ;;
          "emails")
            openclaw run content-generation generate-marketing-email --type=weekly_digest
            ;;
        esac
      done
      
      echo "✅ Batch generation complete!"
---

# 📝 Content Generation Skill

AI-powered content creation using Ollama (local) or OpenAI API.

## Features

- **Daily Horoscopes** - Auto-generate all 12 signs
- **Social Media Posts** - Instagram, Twitter, Facebook content
- **Marketing Emails** - Welcome, digest, promo campaigns
- **Blog Articles** - SEO-optimized astrology content

## Requirements

### Option 1: Ollama (Local, Free)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull deepseek-r1:1.5b

# Set environment
export OLLAMA_HOST=http://localhost:11434
```

### Option 2: OpenAI API (Cloud)
```bash
export OPENAI_API_KEY="your-key"
```

## Scheduled Tasks

- **Daily at 6:00 AM**: Generate all horoscopes + social content

## Usage Examples

```bash
# Generate today's horoscopes
openclaw run content-generation generate-daily-horoscopes

# Generate Instagram post
openclaw run content-generation generate-social-post \
  --zodiac_sign=leo \
  --topic=love \
  --platform=instagram

# Generate marketing email
openclaw run content-generation generate-marketing-email \
  --type=premium_promo

# Batch generate everything
openclaw run content-generation batch-generate-content \
  --content_types='["horoscopes", "social_posts"]'
```
