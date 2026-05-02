# OpenClaw Integration Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   OpenClaw      │────▶│   Supabase       │────▶│   FastAPI       │
│   Gateway       │     │   Edge Functions │     │   Backend       │
│                 │     │   (Serverless)   │     │   (Swiss/Llama) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                                │
        │                                                ▼
        │                                       ┌─────────────────┐
        │                                       │   Supabase DB   │
        │                                       │   (Users/Data)  │
        │                                       └─────────────────┘
        │
        ▼
┌─────────────────┐
│   Messaging     │
│   Platforms     │
│ - WhatsApp      │
│ - Telegram      │
│ - Discord       │
└─────────────────┘
```

## Deployment Steps

### 1. Deploy Supabase Edge Functions

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref <your-project-id>

# Deploy all functions
supabase functions deploy daily_horoscope
supabase functions deploy natal_chart
supabase functions deploy synastry
supabase functions deploy tarot
supabase functions deploy life_purpose

# Set secrets
supabase secrets set ASTROLOGY_API_KEY=your-api-key
```

### 2. Deploy FastAPI Backend (Railway/Render/Heroku)

```bash
# Backend with Swiss Ephemeris + Llama AI
cd backend

# Install dependencies
pip install -r requirements.txt

# Run locally for testing
uvicorn api_server:app --reload --port 8000

# Deploy to Railway
railway login
railway init
railway up
```

### 3. Configure OpenClaw

```bash
# Install OpenClaw globally
npm install -g openclaw@latest

# Complete onboarding
openclaw onboard --install-daemon

# Create skills directory
mkdir -p ~/.openclaw/skills/astrology-app

# Copy skill file
cp openclaw_integration/astrology-app/SKILL.md ~/.openclaw/skills/astrology-app/

# Configure environment
# Edit ~/.openclaw/openclaw.json:
{
  "env": {
    "ASTROLOGY_API_URL": "https://your-project.supabase.co/functions/v1",
    "ASTROLOGY_API_KEY": "your-supabase-anon-key"
  }
}

# Restart OpenClaw
openclaw restart
```

### 4. Test the Integration

```bash
# Test daily horoscope
openclaw skills test astrology-app "What's my daily horoscope for Leo?"

# Test natal chart
openclaw skills test astrology-app "Analyze my natal chart, born 1990-05-15 at 14:30 in Zagreb"

# Test synastry
openclaw skills test astrology-app "Check compatibility between Leo and Libra"

# Test tarot
openclaw skills test astrology-app "Give me a tarot reading about my career"

# Test life purpose
openclaw skills test astrology-app "What is my life purpose?"
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/daily-horoscope` | POST | Optional | Daily zodiac horoscope |
| `/api/natal-chart` | POST | Required | Birth chart analysis |
| `/api/synastry` | POST | Required | Relationship compatibility |
| `/api/tarot` | POST | Required | Tarot card reading |
| `/api/life-purpose` | POST | Required | Life purpose analysis |
| `/api/transits` | GET | None | Current planetary positions |
| `/health` | GET | None | Health check |

## Request/Response Examples

### Daily Horoscope
```json
// POST /api/daily-horoscope
{
  "zodiac_sign": "Leo",
  "language": "en"
}

// Response
{
  "success": true,
  "data": {
    "zodiac_sign": "Leo",
    "date": "2025-03-15",
    "horoscope": "🌟 Today your creative energy...",
    "moon_phase": "Waxing Gibbous",
    "is_premium": false
  }
}
```

### Natal Chart
```json
// POST /api/natal-chart
// Headers: Authorization: Bearer <API_KEY>
{
  "birth_date": "1990-05-15",
  "birth_time": "14:30",
  "birth_location": "Zagreb, Croatia",
  "language": "hr"
}

// Response
{
  "success": true,
  "data": {
    "birth_info": {...},
    "chart": {
      "sun_sign": "Taurus",
      "moon_sign": "Cancer",
      "rising_sign": "Leo",
      "planets": {...},
      "aspects": [...]
    },
    "interpretation": "🌟 Natalna Karta Analiza..."
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASTROLOGY_API_URL` | Yes | Supabase functions URL or backend URL |
| `ASTROLOGY_API_KEY` | Yes | API key for premium endpoints |
| `GENSPARK_API_KEY` | Optional | For Genspark AI fallback |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## Supported Zodiac Signs

| Croatian | English |
|----------|---------|
| Ovan | Aries |
| Bik | Taurus |
| Blizanci | Gemini |
| Rak | Cancer |
| Lav | Leo |
| Devica | Virgo |
| Vaga | Libra |
| Škorpion | Scorpio |
| Strelac | Sagittarius |
| Jarac | Capricorn |
| Vodolija | Aquarius |
| Ribe | Pisces |

## Troubleshooting

### Function not loading
```bash
# Check OpenClaw status
openclaw status

# Verify skill location
ls ~/.openclaw/skills/astrology-app/

# Check logs
openclaw logs
```

### API calls failing
```bash
# Verify environment variables
openclaw config show

# Test API directly
curl -X POST "$ASTROLOGY_API_URL/api/daily-horoscope" \
  -H "Content-Type: application/json" \
  -d '{"zodiac_sign": "Leo", "language": "en"}'
```

### Premium features not working
- Ensure `ASTROLOGY_API_KEY` is set correctly
- Check that the key matches between OpenClaw config and backend
- Verify user has premium subscription in database

## Monitoring

```bash
# View real-time logs
openclaw logs --follow

# Check function invocations
supabase functions logs daily_horoscope

# Monitor API health
curl https://your-api.com/health
```

## Support

- **OpenClaw Docs**: https://docs.openclaw.ai
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: GitHub Issues
