#!/bin/sh
set -e

# Scheduling (routes/console.php's Schedule:: definitions) is handled by the
# separate `scheduler` service in docker-compose.prod.yml (`schedule:work`),
# not this container - don't add a schedule:run loop back here or every
# scheduled command will fire twice.

# docker-compose.prod.yml mounts the app_public named volume over
# /var/www/public so nginx can read it read-only. Docker only auto-populates
# a named volume from the image on the volume's *first* creation, so on every
# later redeploy the volume keeps its old contents and masks this image's
# freshly built public/ (see Dockerfile's public-src staging step). Force a
# resync on every start so a rebuilt image's assets always actually reach
# nginx, even on a pre-existing volume.
echo "[startup] Syncing built public/ assets into the app_public volume..."
rm -rf /var/www/public/*
cp -a /var/www/public-src/. /var/www/public/
chown -R www-data:www-data /var/www/public

echo "[startup] Starting PHP-FPM..."
exec php-fpm
