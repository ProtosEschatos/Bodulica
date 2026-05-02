---
name: astrology-core
description: Core astrology API endpoints for horoscopes, natal charts, and compatibility
version: 1.0.0
requires:
  env:
    - ASTROLOGY_API_URL
    - ASTROLOGY_API_KEY
  bins:
    - curl
    - jq
commands:
  daily-horoscope:
    description: Get daily horoscope for a zodiac sign
    params:
      zodiac_sign:
        type: string
        required: true
        enum: [aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces]
      language:
        type: string
        default: en
      date:
        type: string
        format: date
    endpoint: POST /api/daily-horoscope
    free: true
    
  natal-chart:
    description: Calculate and interpret natal chart
    params:
      birth_date:
        type: string
        format: date
        required: true
      birth_time:
        type: string
        format: time
        required: true
      birth_location:
        type: string
        required: true
      latitude:
        type: number
      longitude:
        type: number
      house_system:
        type: string
        default: Placidus
    endpoint: POST /api/natal-chart
    premium: true
    
  synastry:
    description: Relationship compatibility analysis
    params:
      person1:
        type: object
        required: true
      person2:
        type: object
        required: true
      language:
        type: string
        default: en
    endpoint: POST /api/synastry
    premium: true
    
  tarot:
    description: Tarot reading with AI interpretation
    params:
      question:
        type: string
        required: true
      spread_type:
        type: string
        default: three-card
        enum: [single, three-card, celtic-cross]
    endpoint: POST /api/tarot
    premium: true
    
  life-purpose:
    description: Analyze life purpose and karmic patterns
    params:
      birth_date:
        type: string
        format: date
        required: true
      birth_time:
        type: string
        format: time
        required: true
      birth_location:
        type: string
        required: true
    endpoint: POST /api/life-purpose
    premium: true
    
  transits:
    description: Get current planetary positions
    endpoint: GET /api/transits
    free: true
    
  lucky-day:
    description: Get lucky numbers and colors for today
    params:
      zodiac_sign:
        type: string
        required: true
    endpoint: GET /api/lucky-day/{zodiac_sign}
    premium: true
---

# 🌟 Astrology Core Skill

This skill provides access to professional astrology calculations using Swiss Ephemeris and AI interpretation.

## Usage Examples

```bash
# Daily horoscope (FREE)
openclaw run astrology-core daily-horoscope --zodiac_sign=aries

# Natal chart (PREMIUM)
openclaw run astrology-core natal-chart \
  --birth_date=1990-05-15 \
  --birth_time=14:30 \
  --birth_location="Zagreb, Croatia"

# Synastry analysis (PREMIUM)
openclaw run astrology-core synastry \
  --person1='{"birth_date":"1990-05-15","birth_time":"14:30","birth_location":"Zagreb"}' \
  --person2='{"birth_date":"1992-08-20","birth_time":"09:00","birth_location":"Split"}'

# Current transits (FREE)
openclaw run astrology-core transits
```

## API Authentication

For premium features, set the API key:
```bash
export ASTROLOGY_API_KEY="your-api-key"
```

Or in `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "astrology-core": {
      "api_key": "your-api-key"
    }
  }
}
```
