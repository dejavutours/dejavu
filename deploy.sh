#!/bin/bash

# Deploy script for dejavu application
# This script automates the deployment process on EC2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/dejavu"
APP_NAME="dejavutours"
PORT=5000
LOG_FILE="/home/ubuntu/.forever/${APP_NAME}.log"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if EJS render paths match actual file names
validate_ejs_paths() {
    log "Validating EJS file paths for case-sensitivity..."
    
    local errors=0
    
    # Find all res.render calls in controllers
    while IFS= read -r render_line; do
        # Extract the render path (e.g., "pages/Addtours" from res.render("pages/Addtours", ...))
        if [[ $render_line =~ res\.render\([\"']([^\"']+)[\"'] ]]; then
            render_path="${BASH_REMATCH[1]}"
            
            # Skip if it's not a pages/ path
            if [[ ! $render_path =~ ^pages/ ]]; then
                continue
            fi
            
            # Convert render path to file path
            ejs_file="${APP_DIR}/views/${render_path}.ejs"
            
            # Check if file exists (case-sensitive)
            if [ ! -f "$ejs_file" ]; then
                error "EJS file not found: $ejs_file (referenced in: $render_line)"
                errors=$((errors + 1))
            else
                # Check if filename is lowercase
                filename=$(basename "$ejs_file")
                if [[ "$filename" =~ [A-Z] ]]; then
                    error "EJS file has uppercase letters: $ejs_file (should be lowercase for Linux compatibility)"
                    errors=$((errors + 1))
                fi
            fi
        fi
    done < <(grep -r "res\.render(" "${APP_DIR}/controllers" 2>/dev/null || true)
    
    if [ $errors -gt 0 ]; then
        error "EJS validation failed with $errors error(s). Deployment aborted."
        exit 1
    fi
    
    log "EJS validation passed."
}

# Main deployment function
main() {
    log "Starting deployment..."
    
    # Navigate to application directory
    cd "$APP_DIR" || {
        error "Failed to navigate to $APP_DIR"
        exit 1
    }
    
    # Load nvm environment
    log "Loading nvm environment..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Use Node.js 20.x
    log "Setting Node.js version to 20.x..."
    nvm use 20.x || {
        error "Failed to set Node.js version to 20.x"
        exit 1
    }
    
    # Fetch latest code
    log "Fetching latest code from GitHub..."
    git fetch || {
        error "Failed to fetch from GitHub"
        exit 1
    }
    
    # Checkout main branch for package-lock.json
    log "Checking out main branch for package-lock.json..."
    git checkout main -- package-lock.json || {
        warning "Could not checkout package-lock.json from main (may not exist)"
    }
    
    # Pull latest changes
    log "Pulling latest changes from main branch..."
    git pull origin main || {
        error "Failed to pull from main branch"
        exit 1
    }
    
    # Validate EJS paths before proceeding
    validate_ejs_paths
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production || {
        error "Failed to install dependencies"
        exit 1
    }
    
    # Stop forever process gracefully
    log "Stopping forever process: $APP_NAME..."
    forever stop "$APP_NAME" 2>/dev/null || {
        warning "Forever process $APP_NAME was not running (this is OK)"
    }
    
    # Kill any process on port 5000 (cleanup)
    log "Cleaning up port $PORT..."
    PID=$(sudo lsof -t -i:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        log "Killing process $PID on port $PORT..."
        sudo kill -9 "$PID" || {
            warning "Could not kill process on port $PORT (may not exist)"
        }
        sleep 2
    fi
    
    # Start application with forever
    log "Starting application with forever..."
    forever start --uid "$APP_NAME" -a -c "npm run start:prod" ./ || {
        error "Failed to start application with forever"
        exit 1
    }
    
    # Wait a moment for the app to start
    sleep 3
    
    # Verify deployment success
    log "Verifying deployment..."
    if forever list | grep -q "$APP_NAME"; then
        log "Application started successfully!"
        forever list
    else
        error "Application failed to start. Check logs for details."
        if [ -f "$LOG_FILE" ]; then
            error "Last 50 lines of log:"
            tail -n 50 "$LOG_FILE"
        fi
        exit 1
    fi
    
    # Display recent logs
    log "Recent application logs:"
    if [ -f "$LOG_FILE" ]; then
        tail -n 100 "$LOG_FILE"
    else
        warning "Log file not found at $LOG_FILE"
    fi
    
    log "Deployment completed successfully!"
}

# Run main function
main

