# Bodulica Shop

Premium butiga u Betini na Murteru - online shop s autentičnim dalmatinskim proizvodima.

## 🌐 Live Demo

- **Website**: https://bodulica.shop
- **Admin Panel**: https://bodulica.shop/admin.html

## 🏗️ Arhitektura

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Hosting**: Cloudflare Pages
- **CI/CD**: GitHub Actions

## 📁 Struktura

```
bodulica-deploy/
├── index.html      # Početna stranica
├── shop.html       # Shop s proizvodima
├── admin.html      # Admin panel
└── .github/
    └── workflows/
        ├── deploy.yml      # Cloudflare deploy
        └── keep-alive.yml  # Supabase ping
```

## ⚡ Supabase Konfiguracija

- **URL**: https://mbputwgppweoeujiszgv.supabase.co
- **Edge Function**: `/functions/v1/bodulica-api`

## 🔐 Admin Login

- **Username**: `admin`
- **Password**: `bodulica2026`

## 🚀 Deployment

Automatski deploy na Cloudflare Pages prilikom pusha na `main` granu.

## 📝 Napomene

- Košarica se sprema u localStorage (sinkronizacija između stranica)
- Proizvodi se dohvaćaju iz Supabase API-ja
- Offline mode: Ako API nije dostupan, koristi se localStorage
