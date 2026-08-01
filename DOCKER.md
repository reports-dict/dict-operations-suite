# Docker Commands — DICT Operations Suite

## Prerequisites

- Docker Desktop running
- The external MySQL container (`mysql8-mysql-1`) must be up before starting the app

```bash
# Verify the MySQL container is running
docker ps --filter "name=mysql8-mysql-1"
```

`docker-compose.yml` joins the external `mysql8_default` network so the app
container can resolve `mysql8-mysql-1` directly (`.env`'s `DB_HOST`) - no host
file edits or port juggling needed like when running PHP natively on Windows.

---

## Build & Start

```bash
# From the project root
docker compose up -d --build
```

The app runs on **http://localhost:8081**.

## First-Time Setup (run once after first build)

```bash
docker exec dict_ops_app php artisan migrate --force
docker exec dict_ops_app php artisan db:seed --force

# Bootstrap the first superadmin (replace with a real AD samaccountname)
docker exec dict_ops_app php artisan app:grant-superadmin <username>
```

## Start / Stop / Restart

```bash
docker compose start        # start existing containers
docker compose stop         # stop without removing
docker compose restart      # restart both services
docker compose down         # stop and remove containers (MySQL data is untouched - separate container)
docker compose down --rmi all  # also remove built images (forces full rebuild next time)
```

## View Logs

```bash
docker compose logs -f              # both services
docker compose logs -f app          # PHP-FPM only
docker compose logs -f nginx        # Nginx only
```

## Shell Access

```bash
docker exec -it dict_ops_app bash
```

## Rebuild After Dependency Changes

```bash
docker compose up -d --build
```

> Frontend asset changes (JS/TSX/CSS) do **not** require a rebuild or a
> manual `npm run build` - `entrypoint.sh` builds once on container start,
> then runs a background loop that hashes `resources/**/*.{tsx,ts,jsx,js,css}`
> every 2 seconds and re-runs `npm run build` whenever the hash changes,
> writing into the bind-mounted `public/build` automatically. Just refresh
> the browser after saving. Content hashing (rather than `vite build --watch`
> or mtime polling) is deliberate - Vite's built-in watcher relies on
> inotify, which doesn't reliably fire for changes made from the Windows
> host through this bind mount, and a plain mtime check has a race where two
> edits in quick succession can silently drop the second one. Watch
> progress/errors show up in `docker compose logs -f app`.
>
> PHP file changes take effect immediately (bind mount, no rebuild needed).
> Only `Dockerfile`/`composer.json`/system dependency changes need
> `--build` (this includes changes to `docker/entrypoint.sh`, since it's
> baked into the image rather than bind-mounted).

## Quick Reference

| Task | Command |
|------|---------|
| Start everything | `docker compose up -d --build` |
| App URL | http://localhost:8081 |
| App shell | `docker exec -it dict_ops_app bash` |
| Logs | `docker compose logs -f` |
| Run artisan command | `docker exec dict_ops_app php artisan <command>` |
| Clear Laravel cache | `docker exec dict_ops_app php artisan optimize:clear` |
