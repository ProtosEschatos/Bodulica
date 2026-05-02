# OpenClaw Integration for Astro Insights App

## Overview

This directory contains the OpenClaw skill configuration for integrating the Astro Insights Celestial Oracle app with OpenClaw gateway, enabling AI-powered astrology readings through multiple messaging platforms (WhatsApp, Telegram, Discord, etc.).

## Installation

### Prerequisites
1. Install OpenClaw globally:
```bash
npm install -g openclaw@latest
```

2. Complete OpenClaw onboarding:
```bash
openclaw onboard --install-daemon
```

### Setup the Astrology Skill

1. Create the OpenClaw skills directory if it doesn't exist:
```bash
mkdir -p ~/.openclaw/skills/astrology-app
```

2. Copy the skill file:
```bash
cp openclaw_integration/astrology-app/SKILL.md ~/.openclaw/skills/astrology-app/
```

3. Set up environment variables in your OpenClaw config:
```bash
# Edit ~/.openclaw/openclaw.json
# Add these environment variables:
{
  "env": {
    "ASTROLOGY_API_URL": "https://your-backend-url.com",
    "ASTROLOGY_API_KEY": "your-api-key-here"
  }
}
```

4. Restart OpenClaw to load the new skill:
```bash
openclaw restart
```

## Available Features

### Free Features
- **Daily Horoscopes**: Get daily predictions for all 12 zodiac signs
- **Basic Astrology Information**: General zodiac sign characteristics

### Premium Features (Require API Key)
- **Natal Chart Analysis**: Complete birth chart interpretation
- **Synastry Analysis**: Relationship compatibility between two people
- **Tarot Readings**: AI-powered tarot interpretations
- **Life Purpose Analysis**: Karmic patterns and life destiny insights
- **Extended Forecasts**: Weekly, monthly, and yearly predictions

## Usage Examples

Once configured, users can interact with the astrology app through any connected messaging platform:

### Daily Horoscope
```
What's my horoscope today?
Daily horoscope for Leo
Dnevni horoskop za Vodoliju
```

### Natal Chart Analysis
```
Analyze my birth chart - born May 15, 1990 at 2:30 PM in Zagreb
Natal chart interpretation for 1990-05-15, 14:30, Zagreb, Croatia
```

### Compatibility Analysis
```
Check compatibility between Aries (1990-05-15, Zagreb) and Libra (1992-08-22, Split)
Relationship compatibility analysis
```

### Tarot Reading
```
Three card tarot reading about my career
Celtic cross tarot spread for love life guidance
```

### Life Purpose
```
What is my life purpose according to astrology?
Karmic patterns and destiny analysis
```

## Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASTROLOGY_API_URL` | Yes | Your backend API base URL |
| `ASTROLOGY_API_KEY` | Yes | Authentication token for premium features |

### Language Support

The skill supports:
- **Croatian (hr)**: Default language, local zodiac sign names
- **English (en)**: International zodiac sign names

### Zodiac Signs (Croatian/English)

- Ovan / Aries
- Bik / Taurus  
- Blizanci / Gemini
- Rak / Cancer
- Lav / Leo
- Devica / Virgo
- Vaga / Libra
- Škorpion / Scorpio
- Strelac / Sagittarius
- Jarac / Capricorn
- Vodolija / Aquarius
- Ribe / Pisces

## Security Considerations

1. **API Key Protection**: Store your API key securely in OpenClaw environment variables
2. **Access Control**: Configure OpenClaw's allowlist features to restrict access
3. **Rate Limiting**: Monitor API usage to prevent abuse
4. **Data Privacy**: Ensure compliance with astrology data handling regulations

## Troubleshooting

### Common Issues

1. **Skill not loading**: Check that the SKILL.md file is in the correct directory
2. **API calls failing**: Verify environment variables are set correctly
3. **Authentication errors**: Ensure API key is valid and has proper permissions
4. **Language issues**: Check that language parameter is 'hr' or 'en'

### Debug Commands

```bash
# Check OpenClaw status
openclaw status

# View loaded skills
openclaw skills list

# Test skill manually
openclaw skills test astrology-app

# View logs
openclaw logs
```

## Development

### Extending the Skill

To add new features:

1. Edit `~/.openclaw/skills/astrology-app/SKILL.md`
2. Add new API endpoints following the existing pattern
3. Restart OpenClaw: `openclaw restart`

### Testing

Test the skill using OpenClaw's test interface:

```bash
openclaw skills test astrology-app "What's my daily horoscope for Leo?"
```

## Support

For issues with:
- **OpenClaw**: Check OpenClaw documentation at https://docs.openclaw.ai
- **Astrology Backend**: Review the backend logs and API documentation
- **Integration**: Check this skill's configuration and environment variables

## License

This integration follows the same MIT license as the main Astro Insights project.
