#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Atomic Deploy Script - Zero-Downtime Deployment with Symlink Swap
# =============================================================================
# Structure:
#   apps/infinity/releases/<timestamp>/  - versioned builds
#   apps/infinity/current                - symlink to active release
#   apps/infinity/shared/                - persistent files (logs, uploads, etc.)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/apps/infinity"
RELEASES_DIR="$APP_DIR/releases"
SHARED_DIR="$APP_DIR/shared"
CURRENT_LINK="$APP_DIR/current"

RELEASE_ID="${RELEASE_ID:-$(date +%Y-%m-%d-%H%M%S)}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
KEEP_RELEASES="${KEEP_RELEASES:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Commands
# =============================================================================

cmd_deploy() {
    log_info "Starting atomic deploy - Release: $RELEASE_ID"
    
    # Step 1: Create release directory structure
    log_info "Creating release directory: $RELEASE_DIR"
    mkdir -p "$RELEASE_DIR"
    mkdir -p "$SHARED_DIR"
    
    # Step 2: Copy source files (excluding build artifacts and node_modules)
    log_info "Copying source files to release..."
    rsync -a --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'releases' \
        --exclude 'current' \
        --exclude 'shared' \
        --exclude 'build' \
        --exclude '.turbo' \
        --exclude 'coverage' \
        "$PROJECT_ROOT/" "$RELEASE_DIR/"
    
    # Step 3: Install dependencies
    log_info "Installing dependencies..."
    cd "$RELEASE_DIR"
    yarn install --frozen-lockfile
    
    # Step 4: Build the application
    log_info "Building application..."
    yarn workspace @infinity/app build
    
    # Step 5: Copy .env to build
    if [[ -f "$RELEASE_DIR/apps/infinity/.env" ]]; then
        cp "$RELEASE_DIR/apps/infinity/.env" "$RELEASE_DIR/apps/infinity/build/"
        log_ok ".env copied to build"
    else
        log_warn "No .env file found - make sure to configure environment"
    fi
    
    # Step 6: Verify build artifacts
    log_info "Verifying build..."
    if [[ ! -f "$RELEASE_DIR/apps/infinity/build/public/assets/.vite/manifest.json" ]]; then
        log_error "Build verification failed: manifest.json not found"
        exit 1
    fi
    log_ok "Build verified - manifest.json exists"
    
    # Step 7: Link shared directories (logs, uploads, etc.)
    cmd_link_shared
    
    # Step 8: Atomic symlink swap
    cmd_swap
    
    # Step 9: Cleanup old releases
    cmd_cleanup
    
    log_ok "Deploy completed successfully!"
    log_info "Active release: $RELEASE_ID"
    log_info "To start: yarn deploy:start"
    log_info "To rollback: yarn deploy:rollback"
}

cmd_swap() {
    log_info "Performing atomic symlink swap..."
    
    if [[ ! -d "$RELEASE_DIR" ]]; then
        log_error "Release directory does not exist: $RELEASE_DIR"
        exit 1
    fi
    
    # Create new symlink
    ln -s "$RELEASE_DIR" "$CURRENT_LINK.new"
    
    # Atomic swap using mv -T (rename)
    mv -Tf "$CURRENT_LINK.new" "$CURRENT_LINK"
    
    log_ok "Symlink swapped: current -> $RELEASE_ID"
}

cmd_link_shared() {
    log_info "Linking shared directories..."
    
    # Create shared subdirectories if they don't exist
    mkdir -p "$SHARED_DIR/logs"
    mkdir -p "$SHARED_DIR/uploads"
    mkdir -p "$SHARED_DIR/tmp"
    
    # Link shared directories into the release
    local build_dir="$RELEASE_DIR/apps/infinity/build"
    
    # Remove existing directories in build and create symlinks
    rm -rf "$build_dir/logs" 2>/dev/null || true
    rm -rf "$build_dir/uploads" 2>/dev/null || true
    rm -rf "$build_dir/tmp" 2>/dev/null || true
    
    ln -sf "$SHARED_DIR/logs" "$build_dir/logs"
    ln -sf "$SHARED_DIR/uploads" "$build_dir/uploads"
    ln -sf "$SHARED_DIR/tmp" "$build_dir/tmp"
    
    log_ok "Shared directories linked"
}

cmd_rollback() {
    log_info "Rolling back to previous release..."
    
    # Get list of releases sorted by date (newest first)
    local releases=($(ls -1t "$RELEASES_DIR" 2>/dev/null))
    
    if [[ ${#releases[@]} -lt 2 ]]; then
        log_error "No previous release available for rollback"
        exit 1
    fi
    
    # Current release is releases[0], rollback to releases[1]
    local current_release="${releases[0]}"
    local previous_release="${releases[1]}"
    
    log_info "Current: $current_release"
    log_info "Rolling back to: $previous_release"
    
    RELEASE_DIR="$RELEASES_DIR/$previous_release"
    cmd_swap
    
    log_ok "Rollback completed to: $previous_release"
    log_warn "You may need to restart the server: yarn deploy:restart"
}

cmd_cleanup() {
    log_info "Cleaning up old releases (keeping $KEEP_RELEASES)..."
    
    local releases=($(ls -1t "$RELEASES_DIR" 2>/dev/null))
    local count=${#releases[@]}
    
    if [[ $count -le $KEEP_RELEASES ]]; then
        log_info "No releases to clean up ($count <= $KEEP_RELEASES)"
        return
    fi
    
    for ((i=$KEEP_RELEASES; i<$count; i++)); do
        local old_release="${releases[$i]}"
        log_info "Removing old release: $old_release"
        rm -rf "$RELEASES_DIR/$old_release"
    done
    
    log_ok "Cleanup completed"
}

cmd_list() {
    log_info "Available releases:"
    
    if [[ ! -d "$RELEASES_DIR" ]]; then
        log_warn "No releases directory found"
        return
    fi
    
    local current_target=""
    if [[ -L "$CURRENT_LINK" ]]; then
        current_target=$(readlink "$CURRENT_LINK")
        current_target=$(basename "$current_target")
    fi
    
    for release in $(ls -1t "$RELEASES_DIR" 2>/dev/null); do
        if [[ "$release" == "$current_target" ]]; then
            echo -e "  ${GREEN}* $release${NC} (active)"
        else
            echo "    $release"
        fi
    done
}

cmd_start() {
    log_info "Starting application from current release..."
    
    if [[ ! -L "$CURRENT_LINK" ]]; then
        log_error "No current release symlink found. Run deploy first."
        exit 1
    fi
    
    cd "$CURRENT_LINK/apps/infinity/build"
    NODE_ENV=production node bin/server.js
}

cmd_status() {
    echo ""
    log_info "Deployment Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [[ -L "$CURRENT_LINK" ]]; then
        local target=$(readlink "$CURRENT_LINK")
        echo -e "Current release: ${GREEN}$(basename "$target")${NC}"
    else
        echo -e "Current release: ${RED}None${NC}"
    fi
    
    local count=$(ls -1 "$RELEASES_DIR" 2>/dev/null | wc -l | tr -d ' ')
    echo "Total releases: $count"
    echo "Keep releases: $KEEP_RELEASES"
    echo ""
    
    cmd_list
}

cmd_help() {
    echo "
Atomic Deploy Script - Zero-Downtime Deployment

Usage: $0 <command>

Commands:
  deploy      Build and deploy a new release (full workflow)
  swap        Swap symlink to a specific release (set RELEASE_ID)
  rollback    Rollback to the previous release
  cleanup     Remove old releases (keeps $KEEP_RELEASES)
  list        List all available releases
  start       Start the application from current release
  status      Show deployment status
  help        Show this help message

Environment Variables:
  RELEASE_ID      Override release timestamp (default: current datetime)
  KEEP_RELEASES   Number of releases to keep (default: 3)

Examples:
  $0 deploy                    # Full deploy
  $0 rollback                  # Rollback to previous
  RELEASE_ID=v1.2.3 $0 deploy  # Deploy with custom release name
  KEEP_RELEASES=5 $0 cleanup   # Keep 5 releases
"
}

# =============================================================================
# Main
# =============================================================================

main() {
    local cmd="${1:-help}"
    
    case "$cmd" in
        deploy)   cmd_deploy ;;
        swap)     cmd_swap ;;
        rollback) cmd_rollback ;;
        cleanup)  cmd_cleanup ;;
        list)     cmd_list ;;
        start)    cmd_start ;;
        status)   cmd_status ;;
        help)     cmd_help ;;
        *)
            log_error "Unknown command: $cmd"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
