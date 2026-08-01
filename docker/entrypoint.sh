#!/bin/sh
set -e

LOCKFILE="/var/www/package-lock.json"
HASH_FILE="/var/www/node_modules/.install_hash"

# Only run npm ci if node_modules is missing or package-lock.json changed
CURRENT_HASH=$(md5sum "$LOCKFILE" | awk '{print $1}')

if [ ! -d "/var/www/node_modules" ] || [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE")" != "$CURRENT_HASH" ]; then
    echo "[startup] Installing npm dependencies..."
    npm ci --prefix /var/www
    echo "$CURRENT_HASH" > "$HASH_FILE"
fi

echo "[startup] Building frontend assets..."
npm run build --prefix /var/www

echo "[startup] Starting frontend asset watcher (auto-rebuild on change)..."
# Vite/Rolldown's built-in --watch relies on inotify, which doesn't reliably
# fire for changes made from the Windows host through this bind mount - so we
# poll content hashes ourselves instead of trusting inotify-based watching.
# (An earlier mtime-based version using `find -newer` had a race: two edits
# landing within the same poll cycle could have the second edit's mtime fall
# just before the marker got touched for the first, silently dropping it.
# Hashing file contents avoids that entirely - it doesn't depend on timing.)
(
    cd /var/www
    HASH_FILE="/tmp/.frontend_content_hash"
    hash_sources() {
        find resources -type f \( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' -o -name '*.css' \) \
            -exec md5sum {} + 2>/dev/null | sort | md5sum | awk '{print $1}'
    }
    hash_sources > "$HASH_FILE"
    while true; do
        sleep 2
        NEW_HASH=$(hash_sources)
        if [ "$NEW_HASH" != "$(cat "$HASH_FILE" 2>/dev/null)" ]; then
            echo "[watch] Change detected - rebuilding..."
            echo "$NEW_HASH" > "$HASH_FILE"
            npm run build --prefix /var/www
        fi
    done
) &

if [ ! -f /var/www/.env ]; then
    echo "[startup] No .env found - copying .env.example"
    cp /var/www/.env.example /var/www/.env
    php /var/www/artisan key:generate
fi

echo "[startup] Starting Laravel scheduler loop (schedule:run every 60s)..."
# Nothing else invokes the Laravel scheduler in this container - no cron,
# no supervisor. `schedule:run` is a no-op unless a due task exists, so
# polling every minute is the standard way to drive Schedule:: definitions
# (see routes/console.php) without a real cron daemon.
(
    while true; do
        php /var/www/artisan schedule:run >> /var/www/storage/logs/schedule.log 2>&1
        sleep 60
    done
) &

echo "[startup] Starting PHP-FPM..."
exec php-fpm
