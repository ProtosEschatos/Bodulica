# Web Development Skill

## Description
Automated web development assistant that builds, fixes, and deploys web applications using AI assistance.

## Capabilities
- **Build**: Compile Next.js, React, Astro, Svelte projects
- **Fix**: Auto-detect and fix common deployment issues (headers, DNS, redirects)
- **Deploy**: GitHub Actions, Cloudflare Pages, Vercel, Netlify
- **Health Check**: Monitor site status and response times
- **AI Assist**: Use DeepSeek (Ollama) and Claude for code generation

## Commands
- `openclaw webdev build [path]` - Build project
- `openclaw webdev fix [path]` - Fix deployment issues
- `openclaw webdev deploy [path]` - Deploy to Cloudflare
- `openclaw webdev health [url]` - Check site health

## AI Integration
- **DeepSeek** (Ollama, free): Local AI for code suggestions
- **Claude**: Advanced code review and debugging

## Auto-Fixes
- Referrer-Policy typos in _headers
- Missing DNS records
- Broken redirect rules
- Cache issues

## Priority: HIGH
Critical for maintaining bodulica.shop and other projects.
