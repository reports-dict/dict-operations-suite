# ---- Frontend build (production target only - dev builds assets itself via
# entrypoint.sh against the bind-mounted source instead) ----
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM php:8.4-fpm AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    gpg \
    apt-transport-https \
    unixodbc-dev \
    libzip-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libicu-dev \
    libldap2-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC Driver 18 for SQL Server (Debian 12 / Bookworm) -
# needed for the read-only sparcsn4 (Navis N4) connection.
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list \
        > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Install PHP SQL Server extensions
RUN pecl install sqlsrv pdo_sqlsrv \
    && docker-php-ext-enable sqlsrv pdo_sqlsrv

# Install standard PHP extensions
RUN docker-php-ext-configure ldap \
    && docker-php-ext-install \
    pdo_mysql \
    ldap \
    mbstring \
    exif \
    pcntl \
    bcmath \
    zip \
    opcache \
    intl \
    gd

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files first for layer caching
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --ignore-platform-reqs

# Copy application files
COPY . .

# Recreate the runtime-writable storage dirs .dockerignore deliberately
# excludes (cache/data, sessions, views) - Laravel needs them to exist even
# empty (e.g. Blade's compiled-view cache path) or it errors at request time.
RUN mkdir -p storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/framework/testing \
    storage/logs

# Finalise Composer autoloader
RUN composer dump-autoload --optimize --ignore-platform-reqs

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

COPY docker/php/php.ini /usr/local/etc/php/conf.d/custom.ini

EXPOSE 9000

CMD ["php-fpm"]

# ---- Development target (default for docker-compose.yml) - source is
# bind-mounted over this at runtime; entrypoint.sh installs node_modules and
# builds/watches assets itself, so Node is only needed here, not in prod. ----
FROM base AS development

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["php-fpm"]

# ---- Production target (docker-compose.prod.yml) - no bind mount, no Node:
# frontend assets are built once in frontend-build above and copied in;
# dev dependencies are stripped since nothing here runs tests/tooling. ----
FROM base AS production

RUN composer install --no-dev --optimize-autoloader --ignore-platform-reqs

COPY --from=frontend-build /app/public/build ./public/build
RUN chown -R www-data:www-data /var/www/public/build

# Stage a pristine copy of the built public/ dir outside the path
# docker-compose.prod.yml's app_public named volume mounts over at runtime.
# Docker only auto-populates a named volume from the image the *first* time
# the volume is created - every later rebuild/--force-recreate leaves
# whatever was already in the volume untouched, which silently froze
# deployed public/ (Vite build output, index.php, etc.) at whatever it
# looked like on day one. entrypoint.prod.sh rsyncs this staged copy back
# over the live volume-backed public/ on every container start so a rebuilt
# image's assets actually reach nginx.
RUN cp -a /var/www/public /var/www/public-src

COPY docker/entrypoint.prod.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["php-fpm"]
