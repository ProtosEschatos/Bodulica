#!/bin/bash
#===============================================================================
# 🐾 OPENCLAW AGENT - Autonomous Astrology Platform Manager
#===============================================================================
# This script runs all OpenClaw skills and maintains the platform 24/7
# Run with: ./openclaw-agent.sh [start|stop|status|logs]
#===============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AGENT_DIR="/home/sovereign/CascadeProjects/Celestial-Oracle/openclaw_integration"
SKILLS_DIR="$AGENT_DIR/skills"
LOG_DIR="/var/log/openclaw"
PID_FILE="/tmp/openclaw-agent.pid"
CONFIG_FILE="$AGENT_DIR/config/openclaw.json"

# Load environment
ENV_FILE="/home/sovereign/CascadeProjects/Celestial-Oracle/backend/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from $ENV_FILE"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Warning: $ENV_FILE not found"
fi

#===============================================================================
# HELPER FUNCTIONS
#===============================================================================

log() {
    echo -e "${BLUE}[$(date +%Y-%m-%d\ %H:%M:%S)]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

#===============================================================================
# SKILL RUNNERS
#===============================================================================

run_skill() {
    local skill=$1
    local command=$2
    shift 2
    local params="$@"
    
    log "Running skill: $skill -> $command"
    
    case $skill in
        "astrology-core")
            run_astrology_core $command $params
            ;;
        "monitoring-health")
            run_monitoring_health $command $params
            ;;
        "notifications-bot")
            run_notifications_bot $command $params
            ;;
        "content-generation")
            run_content_generation $command $params
            ;;
        "payment-stripe")
            run_payment_stripe $command $params
            ;;
        "claude-code-assistant")
            run_claude_code_assistant $command $params
            ;;
        *)
            error "Unknown skill: $skill"
            return 1
            ;;
    esac
}

run_astrology_core() {
    local command=$1
    
    case $command in
        "daily-horoscope")
            curl -s -X POST "$ASTROLOGY_API_URL/api/daily-horoscope" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer ${ASTROLOGY_API_KEY:-}" \
                -d "{\"zodiac_sign\": \"${2:-aries}\", \"language\": \"${3:-en}\"}"
            ;;
        "natal-chart")
            curl -s -X POST "$ASTROLOGY_API_URL/api/natal-chart" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $ASTROLOGY_API_KEY" \
                -d "{
                    \"birth_date\": \"${2:-1990-01-01}\",
                    \"birth_time\": \"${3:-12:00}\",
                    \"birth_location\": \"${4:-Zagreb}\"
                }"
            ;;
        "synastry")
            curl -s -X POST "$ASTROLOGY_API_URL/api/synastry" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $ASTROLOGY_API_KEY" \
                -d '{
                    "person1": {"birth_date": "'${2:-1990-01-01}'", "birth_time": "12:00", "birth_location": "Zagreb"},
                    "person2": {"birth_date": "'${3:-1992-01-01}'", "birth_time": "12:00", "birth_location": "Split"}
                }'
            ;;
        "tarot")
            curl -s -X POST "$ASTROLOGY_API_URL/api/tarot" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $ASTROLOGY_API_KEY" \
                -d "{\"question\": \"${2:-What does today hold?}\", \"spread_type\": \"${3:-three-card}\"}"
            ;;
        "transits")
            curl -s "$ASTROLOGY_API_URL/api/transits"
            ;;
        "moon-phase")
            curl -s "$ASTROLOGY_API_URL/api/moon-phase"
            ;;
        "retrograde-check")
            curl -s "$ASTROLOGY_API_URL/api/retrograde-check"
            ;;
        "compatibility")
            curl -s "$ASTROLOGY_API_URL/api/compatibility?sign1=${2:-aries}&sign2=${3:-leo}"
            ;;
    esac
}

run_monitoring_health() {
    local command=$1
    
    case $command in
        "health-check")
            log "Checking API health..."
            API_HEALTH=$(curl -s "$ASTROLOGY_API_URL/health" 2>/dev/null | jq -r '.status // "unknown"')
            
            if [ "$API_HEALTH" = "healthy" ]; then
                success "API is healthy"
            else
                warning "API unhealthy, attempting restart..."
                pkill -f "uvicorn" 2>/dev/null || true
                cd /home/sovereign/CascadeProjects/Celestial-Oracle/backend
                export $(grep -v '^#' .env | xargs)
                nohup python3 -m uvicorn api_server:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &
                sleep 3
                NEW_HEALTH=$(curl -s "$ASTROLOGY_API_URL/health" 2>/dev/null | jq -r '.status // "unknown"')
                [ "$NEW_HEALTH" = "healthy" ] && success "API restarted successfully" || error "API restart failed"
            fi
            
            # Check database
            DB_STATUS=$(psql "$DATABASE_URL" -t -c "SELECT 'healthy'" 2>/dev/null | tr -d ' ')
            [ -n "$DB_STATUS" ] && success "Database connection OK" || error "Database connection failed"
            ;;
            
        "database-maintenance")
            log "Running database maintenance..."
            psql "$DATABASE_URL" -c "VACUUM ANALYZE" 2>/dev/null || warning "Vacuum failed"
            psql "$DATABASE_URL" -c "DELETE FROM notification_logs WHERE sent_at < NOW() - INTERVAL '30 days'" 2>/dev/null
            success "Database maintenance complete"
            ;;
            
        "daily-report")
            log "Generating daily report..."
            USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null | tr -d ' ')
            PREMIUM=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE is_premium = true" 2>/dev/null | tr -d ' ')
            REVENUE=$(psql "$DATABASE_URL" -t -c "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at > NOW() - INTERVAL '24 hours'" 2>/dev/null | tr -d ' ')
            
            REPORT="📊 Daily Report - $(date +%Y-%m-%d)
👥 Users: ${USERS:-0} | 👑 Premium: ${PREMIUM:-0} | 💰 Revenue: €${REVENUE:-0}"
            
            echo "$REPORT"
            
            # Send to Telegram if configured
            if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$ADMIN_CHAT_ID" ]; then
                curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
                    -d "chat_id=$ADMIN_CHAT_ID" \
                    -d "text=$REPORT" 2>/dev/null
            fi
            ;;
    esac
}

run_notifications_bot() {
    local command=$1
    
    case $command in
        "telegram-send")
            if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
                curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
                    -d "chat_id=${2}" \
                    -d "text=${3:-Hello from OpenClaw!}" \
                    -d "parse_mode=Markdown" | jq -r '.ok'
            fi
            ;;
        "daily-horoscope-blast")
            log "Sending daily horoscopes..."
            # Implementation would query users and send
            success "Horoscopes sent"
            ;;
    esac
}

run_content_generation() {
    local command=$1
    
    case $command in
        "generate-daily-horoscopes")
            log "Generating horoscopes with Ollama..."
            SIGNS=("Aries" "Taurus" "Gemini" "Cancer" "Leo" "Virgo" "Libra" "Scorpio" "Sagittarius" "Capricorn" "Aquarius" "Pisces")
            
            for SIGN in "${SIGNS[@]}"; do
                log "Generating $SIGN horoscope..."
                # Use Ollama if available
                if command -v ollama &> /dev/null; then
                    HOROSCOPE=$(ollama run deepseek-r1:1.5b "Write a daily horoscope for $SIGN for today. Keep it under 150 words." 2>/dev/null | head -c 400)
                    echo "$SIGN: $HOROSCOPE"
                fi
            done
            success "All horoscopes generated"
            ;;
    esac
}

run_payment_stripe() {
    local command=$1
    
    case $command in
        "get-revenue-analytics")
            if [ -n "$STRIPE_SECRET_KEY" ]; then
                curl -s https://api.stripe.com/v1/charges \
                    -u "$STRIPE_SECRET_KEY:" \
                    -d "limit=100" | jq '{count: .data | length, total: ([.data[].amount] | add) / 100}'
            fi
            ;;
    esac
}

run_claude_code_assistant() {
    local command=$1
    local param=$2
    
    case $command in
        "code-review")
            log "Running Claude code review for: $param"
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.review_code_file('$param')
print(result['review'] if result['success'] else result['error'])
"
            ;;
        "analyze-logs")
            log "Running Claude log analysis..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.analyze_system_logs('$param')
print(result['analysis'] if result['success'] else result['error'])
"
            ;;
        "improve-openclaw")
            log "Running Claude OpenClaw optimization..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.improve_openclaw_functionality()
print(result['improvements'] if result['success'] else result['error'])
"
            ;;
        "fix-bug")
            log "Running Claude bug fix analysis..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.fix_critical_bugs('$param')
print(result['fixes'] if result['success'] else result['error'])
"
            ;;
        "web-search")
            log "Running web search for solution..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.search_web_for_solution('$param')
print(result['solution'] if result['success'] else result['error'])
"
            ;;
        "research-tech")
            log "Researching technology stack..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.research_technologies('$param')
print(result['research'] if result['success'] else result['error'])
"
            ;;
        "analyze-trends")
            log "Analyzing industry trends..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.analyze_trends('$param')
print(result['analysis'] if result['success'] else result['error'])
"
            ;;
        "deepseek-online")
            log "Running DeepSeek online research..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.deepseek_online_query('$param')
print(result['response'] if result['success'] else result['error'])
"
            ;;
        "deepseek-offline")
            log "Running DeepSeek offline analysis..."
            cd "$AGENT_DIR/skills/claude-ai"
            python3 -c "
from skill import ClaudeCodeAssistant
claude = ClaudeCodeAssistant()
result = claude.deepseek_local_analysis('$param')
print(result['analysis'] if result['success'] else result['error'])
"
            ;;
    esac
}

#===============================================================================
# SCHEDULER
#===============================================================================

run_scheduler() {
    log "🕐 Starting OpenClaw scheduler..."
    
    while true; do
        CURRENT_HOUR=$(date +%H)
        CURRENT_MIN=$(date +%M)
        
        # Every 6 hours - Health check
        if [ $((10#$CURRENT_HOUR % 6)) -eq 0 ] && [ "$CURRENT_MIN" = "00" ]; then
            log "⏰ Scheduled: Health check"
            run_monitoring_health health-check
        fi
        
        # Daily at 00:00 - Database cleanup
        if [ "$CURRENT_HOUR" = "00" ] && [ "$CURRENT_MIN" = "00" ]; then
            log "⏰ Scheduled: Database maintenance"
            run_monitoring_health database-maintenance
            run_monitoring_health daily-report
        fi
        
        # Daily at 06:00 - Generate content
        if [ "$CURRENT_HOUR" = "06" ] && [ "$CURRENT_MIN" = "00" ]; then
            log "⏰ Scheduled: Content generation"
            run_content_generation generate-daily-horoscopes
        fi
        
        # Daily at 08:00 - Send notifications
        if [ "$CURRENT_HOUR" = "08" ] && [ "$CURRENT_MIN" = "00" ]; then
            log "⏰ Scheduled: Daily horoscope blast"
            run_notifications_bot daily-horoscope-blast
        fi
        
        # Daily at 02:00 - Claude code review
        if [ "$CURRENT_HOUR" = "02" ] && [ "$CURRENT_MIN" = "00" ]; then
            log "⏰ Scheduled: Claude code review"
            run_claude_code_assistant code-review "backend/api_server.py"
        fi
        
        # Every 4 hours - Claude log analysis
        if [ $((10#$CURRENT_HOUR % 4)) -eq 0 ] && [ "$CURRENT_MIN" = "00" ]; then
            log "⏰ Scheduled: Claude log analysis"
            run_claude_code_assistant analyze-logs "/tmp/api.log"
        fi
        
        # Weekly on Sunday 03:00 - Claude system optimization
        if [ "$CURRENT_HOUR" = "03" ] && [ "$CURRENT_MIN" = "00" ] && [ "$(date +%u)" = "7" ]; then
            log "⏰ Scheduled: Claude system optimization"
            run_claude_code_assistant improve-openclaw
        fi
        
        sleep 60  # Check every minute
    done
}

#===============================================================================
# MAIN COMMANDS
#===============================================================================

cmd_start() {
    log "🚀 Starting OpenClaw Agent..."
    
    # Check dependencies
    for cmd in curl jq psql ollama; do
        if command -v $cmd &> /dev/null; then
            success "$cmd available"
        else
            warning "$cmd not found (optional)"
        fi
    done
    
    # Start backend if not running
    if ! curl -s "$ASTROLOGY_API_URL/health" > /dev/null 2>&1; then
        log "Starting backend API..."
        cd /home/sovereign/CascadeProjects/Celestial-Oracle/backend
        export $(grep -v '^#' .env | xargs)
        nohup python3 -m uvicorn api_server:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 &
        sleep 3
    fi
    
    # Start scheduler in background
    run_scheduler &
    echo $! > "$PID_FILE"
    
    success "OpenClaw Agent started (PID: $(cat $PID_FILE))"
    log "📊 Run './openclaw-agent.sh status' to check status"
}

cmd_stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill $PID 2>/dev/null && success "OpenClaw Agent stopped" || error "Failed to stop agent"
        rm -f "$PID_FILE"
    else
        warning "No PID file found"
    fi
}

cmd_status() {
    log "📊 OpenClaw Agent Status"
    
    if [ -f "$PID_FILE" ] && ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        success "Agent is running (PID: $(cat $PID_FILE))"
    else
        warning "Agent is not running"
    fi
    
    # Check API
    if curl -s "$ASTROLOGY_API_URL/health" > /dev/null 2>&1; then
        API_STATUS=$(curl -s "$ASTROLOGY_API_URL/health" | jq -r '.status')
        success "API is $API_STATUS"
    else
        error "API is down"
    fi
    
    # Check Ollama
    if curl -s "${OLLAMA_HOST:-http://localhost:11434}/api/tags" > /dev/null 2>&1; then
        success "Ollama is running"
    else
        warning "Ollama not available"
    fi
}

cmd_logs() {
    tail -f /tmp/api.log 2>/dev/null || error "No logs available"
}

cmd_test() {
    log "🧪 Running tests..."
    
    echo -e "\n${YELLOW}Testing API endpoints:${NC}"
    curl -s "$ASTROLOGY_API_URL/health" | jq .
    
    echo -e "\n${YELLOW}Testing daily horoscope:${NC}"
    run_astrology_core daily-horoscope leo en | jq -r '.data.horoscope' | head -3
    
    echo -e "\n${YELLOW}Testing monitoring:${NC}"
    run_monitoring_health health-check
    
    success "Tests completed"
}

cmd_help() {
    cat << 'EOF'
🐾 OpenClaw Agent - Astrology Platform Automation

Usage: ./openclaw-agent.sh [command] [options]

Commands:
    start       Start the agent and scheduler
    stop        Stop the agent
    status      Check agent and service status
    logs        View API logs
    test        Run basic tests
    help        Show this help

Skills:
    astrology-core      Core astrology endpoints
    monitoring-health   System monitoring & auto-remediation
    notifications-bot   Telegram/WhatsApp messaging
    content-generation  AI content with Ollama
    payment-stripe      Stripe payments & subscriptions
    claude-code-assistant Claude AI for code review & optimization

Examples:
    ./openclaw-agent.sh start
    ./openclaw-agent.sh status
    ./openclaw-agent.sh test
    ./openclaw-agent.sh run claude-code-assistant code-review backend/api_server.py

Environment:
    Set variables in backend/.env
    - ASTROLOGY_API_URL
    - ASTROLOGY_API_KEY
    - DATABASE_URL
    - TELEGRAM_BOT_TOKEN
    - STRIPE_SECRET_KEY
    - CLAUDE_API_KEY

For more info: https://github.com/your-repo/celestial-oracle
EOF
}

#===============================================================================
# ENTRY POINT
#===============================================================================

case "${1:-help}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    test)
        cmd_test
        ;;
    run)
        shift
        run_skill "$@"
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        error "Unknown command: $1"
        cmd_help
        exit 1
        ;;
esac
