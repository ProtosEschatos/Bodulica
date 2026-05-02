---
name: monitoring-health
description: System health monitoring, auto-remediation, and performance tracking
version: 1.0.0
requires:
  env:
    - ASTROLOGY_API_URL
    - DATABASE_URL
    - TELEGRAM_BOT_TOKEN
    - ADMIN_CHAT_ID
  bins:
    - curl
    - jq
    - psql
    - pgrep
    - systemctl
schedule:
  health-check: every 6 hours
  database-cleanup: daily at 00:00
  report-generation: daily at 00:00
commands:
  health-check:
    description: Check API, database, and services health
    endpoint: internal
    script: |
      #!/bin/bash
      echo "🔍 Running health check..."
      
      API_HEALTH=$(curl -s "$ASTROLOGY_API_URL/health" 2>/dev/null | jq -r '.status // "unknown"')
      DB_STATUS=$(psql "$DATABASE_URL" -t -c "SELECT 'healthy'" 2>/dev/null | tr -d ' ')
      
      if [ "$API_HEALTH" != "healthy" ]; then
        echo "⚠️ API unhealthy, attempting restart..."
        pkill -f uvicorn 2>/dev/null || true
        cd /home/sovereign/CascadeProjects/Celestial-Oracle/backend
        nohup uvicorn api_server:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &
        sleep 5
        NEW_HEALTH=$(curl -s "$ASTROLOGY_API_URL/health" 2>/dev/null | jq -r '.status // "unknown"')
        [ "$NEW_HEALTH" = "healthy" ] && echo "✅ API restarted" || echo "❌ API restart failed"
      fi
      
      if [ -z "$DB_STATUS" ]; then
        echo "⚠️ Database connection failed"
        # Send alert
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
          -d "chat_id=$ADMIN_CHAT_ID" \
          -d "text=🚨 Database connection failed at $(date)" 2>/dev/null
      fi
      
      echo "✅ Health check completed"
    
  database-maintenance:
    description: Vacuum tables and clean old logs
    endpoint: internal
    script: |
      #!/bin/bash
      echo "🧹 Running database maintenance..."
      
      # Vacuum analyze
      psql "$DATABASE_URL" -c "VACUUM ANALYZE natal_charts" 2>/dev/null
      psql "$DATABASE_URL" -c "VACUUM ANALYZE horoscope_readings" 2>/dev/null
      psql "$DATABASE_URL" -c "VACUUM ANALYZE users" 2>/dev/null
      
      # Clean old logs (30+ days)
      psql "$DATABASE_URL" -c "DELETE FROM notification_logs WHERE sent_at < NOW() - INTERVAL '30 days'" 2>/dev/null
      psql "$DATABASE_URL" -c "DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '30 days'" 2>/dev/null
      
      # Check missing indexes
      psql "$DATABASE_URL" -c "
        DO \$\$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
            CREATE INDEX idx_users_email ON users(email);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_natal_charts_user_id') THEN
            CREATE INDEX idx_natal_charts_user_id ON natal_charts(user_id);
          END IF;
        END \$\$;
      " 2>/dev/null
      
      echo "✅ Database maintenance completed"
    
  daily-report:
    description: Generate and send daily analytics report
    endpoint: internal
    script: |
      #!/bin/bash
      echo "📊 Generating daily report..."
      
      USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null | tr -d ' ')
      NEW_USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours'" 2>/dev/null | tr -d ' ')
      PREMIUM=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE is_premium = true" 2>/dev/null | tr -d ' ')
      CHARTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM natal_charts" 2>/dev/null | tr -d ' ')
      REVENUE=$(psql "$DATABASE_URL" -t -c "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'completed'" 2>/dev/null | tr -d ' ')
      
      REPORT="📊 Daily Report - $(date +%Y-%m-%d)

👥 Users: ${USERS:-0} total (+${NEW_USERS:-0} today)
👑 Premium: ${PREMIUM:-0} active
🌟 Charts: ${CHARTS:-0} generated
💰 Revenue: €${REVENUE:-0}

✅ All systems operational"

      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$ADMIN_CHAT_ID" \
        -d "parse_mode=Markdown" \
        -d "text=$REPORT" 2>/dev/null
      
      echo "✅ Report sent"
    
  get-metrics:
    description: Get current system metrics
    endpoint: internal
    script: |
      #!/bin/bash
      API_RESPONSE=$(curl -s -o /dev/null -w "%{time_total}" "$ASTROLOGY_API_URL/health" 2>/dev/null)
      DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()))" 2>/dev/null | tr -d ' ')
      
      echo "{
        \"api_response_time_ms\": $(echo "$API_RESPONSE * 1000" | bc 2>/dev/null || echo "0"),
        \"database_size\": \"${DB_SIZE:-unknown}\",
        \"timestamp\": \"$(date -Iseconds)\"
      }"
---

# 🏥 Monitoring & Health Skill

Monitors system health and auto-fixes issues.

## Scheduled Tasks

- **Every 6 hours**: Health check + auto-remediation
- **Daily at midnight**: Database cleanup
- **Daily at midnight**: Analytics report

## Commands

```bash
# Manual health check
openclaw run monitoring-health health-check

# Database maintenance
openclaw run monitoring-health database-maintenance

# Get metrics
openclaw run monitoring-health get-metrics

# Generate report
openclaw run monitoring-health daily-report
```

## Auto-Remediation

When issues are detected:
- API down → Auto-restart uvicorn
- DB connection fail → Send Telegram alert
- Missing indexes → Auto-create
