#!/bin/sh
set -e

echo "[startup] Starting Laravel scheduler loop (schedule:run every 60s)..."
# Nothing else invokes the Laravel scheduler in this container - no cron,
# no supervisor. `schedule:run` is a no-op unless a due task exists, so
# polling every minute is the standard way to drive Schedule:: definitions
# (see routes/console.php) without a real cron daemon. Same approach as
# docker/entrypoint.sh (dev) - kept in sync, this is the only piece that
# still applies in production.
(
    while true; do
        php /var/www/artisan schedule:run >> /var/www/storage/logs/schedule.log 2>&1
        sleep 60
    done
) &

echo "[startup] Starting PHP-FPM..."
exec php-fpm
