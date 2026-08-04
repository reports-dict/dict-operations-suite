#!/bin/sh
set -e

# Scheduling (routes/console.php's Schedule:: definitions) is handled by the
# separate `scheduler` service in docker-compose.prod.yml (`schedule:work`),
# not this container - don't add a schedule:run loop back here or every
# scheduled command will fire twice.

echo "[startup] Starting PHP-FPM..."
exec php-fpm
