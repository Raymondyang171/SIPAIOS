#!/bin/bash
# dev_app09.sh - APP-009 Web + API dev environment manager
# Usage: ./dev_app09.sh [start|stop|restart|kill-ports|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_PORT=3001
WEB_PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_port() {
  local port=$1
  if lsof -i :$port -t > /dev/null 2>&1; then
    return 0  # port in use
  else
    return 1  # port free
  fi
}

show_port_status() {
  local port=$1
  local name=$2
  if check_port $port; then
    local pid=$(lsof -i :$port -t 2>/dev/null | head -1)
    local proc=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
    echo -e "  :$port ($name) - ${RED}IN USE${NC} (PID: $pid, $proc)"
  else
    echo -e "  :$port ($name) - ${GREEN}FREE${NC}"
  fi
}

cmd_status() {
  echo "Port status:"
  show_port_status $API_PORT "API"
  show_port_status $WEB_PORT "Web"
}

cmd_kill_ports() {
  log_info "Killing processes on ports $API_PORT and $WEB_PORT..."

  for port in $API_PORT $WEB_PORT; do
    if check_port $port; then
      local pids=$(lsof -i :$port -t 2>/dev/null)
      for pid in $pids; do
        log_info "Killing PID $pid on port $port"
        kill -9 $pid 2>/dev/null || true
      done
    fi
  done

  sleep 1
  log_info "Done. Current status:"
  cmd_status
}

cmd_stop() {
  log_info "Stopping dev servers..."
  cmd_kill_ports
}

cmd_start() {
  log_info "Starting APP-009 dev environment..."

  # Check if ports are in use
  if check_port $API_PORT || check_port $WEB_PORT; then
    log_warn "Ports in use. Cleaning up first..."
    cmd_kill_ports
  fi

  # Start API server
  log_info "Starting API server on :$API_PORT..."
  cd "$PROJECT_ROOT/apps/api"
  pnpm dev > /dev/null 2>&1 &
  API_PID=$!

  # Start Web server
  log_info "Starting Web server on :$WEB_PORT..."
  cd "$PROJECT_ROOT/apps/web"
  pnpm dev > /dev/null 2>&1 &
  WEB_PID=$!

  sleep 2

  log_info "Servers started:"
  echo "  API: http://localhost:$API_PORT (PID: $API_PID)"
  echo "  Web: http://localhost:$WEB_PORT (PID: $WEB_PID)"
  echo ""
  log_info "To stop: $0 stop"
}

cmd_restart() {
  cmd_stop
  sleep 1
  cmd_start
}

cmd_help() {
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start       Start API (3001) and Web (3000) servers"
  echo "  stop        Stop all dev servers"
  echo "  restart     Restart all dev servers"
  echo "  kill-ports  Force kill processes on ports 3000/3001"
  echo "  status      Show port status"
  echo "  help        Show this help"
  echo ""
  echo "Examples:"
  echo "  $0 start       # Start dev environment"
  echo "  $0 kill-ports  # Fix EADDRINUSE errors"
}

# Main
case "${1:-help}" in
  start)      cmd_start ;;
  stop)       cmd_stop ;;
  restart)    cmd_restart ;;
  kill-ports) cmd_kill_ports ;;
  status)     cmd_status ;;
  help|--help|-h) cmd_help ;;
  *)
    log_error "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac
