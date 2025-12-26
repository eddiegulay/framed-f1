#!/bin/bash
set -e

APP_DIR="$HOME/Documents/Misc/framed-f1"
PID_DIR="$APP_DIR/.pids"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

mkdir -p "$PID_DIR"
cd "$APP_DIR"

log() {
    echo "[framed-tv] $1"
}

kill_if_running() {
    if [ -f "$1" ]; then
        PID=$(cat "$1")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "Stopping existing process PID $PID"
            kill "$PID"
            sleep 2
        fi
        rm -f "$1"
    fi
}

log "Cleaning up previous sessions"
kill_if_running "$BACKEND_PID_FILE"
kill_if_running "$FRONTEND_PID_FILE"

log "Starting backend"
npm run dev > backend.log 2>&1 &
echo $! > "$BACKEND_PID_FILE"

log "Starting frontend"
npm run client:dev > frontend.log 2>&1 &
echo $! > "$FRONTEND_PID_FILE"

log "Services started"
log "Backend PID: $(cat $BACKEND_PID_FILE)"
log "Frontend PID: $(cat $FRONTEND_PID_FILE)"

wait
