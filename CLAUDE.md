# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DICT Operations Suite — a Laravel 13 + Inertia (React 19 + TypeScript) app for
Davao International Container Terminal (DICT) operations reporting. It reads
from the Navis SPARCS N4 SQL Server database (`sparcsn4`) — **this is a
read-only reporting app; never write back to `sparcsn4`.**

Built to grow into a multi-module suite. Three modules exist today:

- **Reefer Plug-in Hours Report** — how long reefer containers have been
  plugged in over a date range. Two sub-views under
  `/operations/reefer-plugin-report/...` (see "Module implementation status"
  below for the differences in how each was resolved): `per-container` and
  `per-category`.
- **Road Queue** and **Road Queue (ECD)** — ported from two standalone sibling
  apps (`xps-road-queue`, `xps-road-queue-ecd`). Each is a live,
  auto-refreshing "road queue" board for an unattended TV display (FCL
  import/export truck deliveries for Road Queue; empty-container-to-storage-
  depot deliveries for ECD — "ECD" = Empty Container Depot), plus a
  permission-gated historical dashboard (shift TAT averages + "high elapsed
  transaction" tracking, filters, CSV export) fed by a snapshot captured on
  every board load. See "Road Queue / Road Queue (ECD) modules" below — these
  two deviate from the standard module pattern in a specific, deliberate way
  (public board routes).

Future modules slot in under the same `/operations/...` namespace, each with
its own Service class and its own entry in the `modules` table/permission
registry — don't collapse them into one catch-all service.

Full product/business context (business rules around plug-in/unplug events,
duplicate container semantics, open questions still being confirmed with the
stakeholder) lives in `APP REQUIREMENT.md` — read it before changing anything
under `Operations/`.

## Commands

This app runs via Docker (there is no supported native-Windows PHP path —
`sqlsrv` isn't available outside the container). See `DOCKER.md` for full
detail; MySQL runs in an external `mysql8-mysql-1` container that must
already be up (joins the `mysql8_default` external network).

```bash
# Build & start (app on http://localhost:8081)
docker compose up -d --build

# First-time setup
docker exec dict_ops_app php artisan migrate --force
docker exec dict_ops_app php artisan db:seed --force
docker exec dict_ops_app php artisan app:grant-superadmin <ad-username>

# Day to day
docker exec dict_ops_app php artisan <command>
docker exec -it dict_ops_app bash
docker compose logs -f app
```

PHP file changes apply immediately (bind mount). Frontend changes are picked
up automatically too — `entrypoint.sh` builds once on container start, then
runs a background loop that hashes `resources/` source file contents every 2
seconds (not `vite build --watch`'s inotify, which doesn't reliably fire for
changes made from the Windows host through the bind mount, and not plain
mtime polling, which has a race where two rapid edits can drop the second)
and reruns `npm run build` whenever the hash changed; no manual
`npm run build` needed (just refresh the browser). `--build` is only needed
after `Dockerfile`/`composer.json`/system dependency changes, or after
editing `docker/entrypoint.sh` itself (it's baked into the image, not
bind-mounted).

`entrypoint.sh` also runs a background loop calling `php artisan schedule:run`
every 60s — this is the only thing driving `Schedule::` definitions in
`routes/console.php` (there's no real cron/supervisor in this container).
Currently used only by `operations:purge-history` (daily at 02:00).

### Tests

```bash
docker exec dict_ops_app php artisan test
docker exec dict_ops_app php artisan test --filter=ReeferPluginReportTest
docker exec dict_ops_app php artisan test tests/Feature/ReeferPluginReportTest.php
```

Road Queue / Road Queue (ECD) tests hit the live `sparcsn4` connection too
(no mocking) — same reliance as the Reefer tests below.

Tests are Pest (`pestphp/pest` + `pestphp/pest-plugin-laravel`). Feature
tests run against the real `mysql` connection, seeded via `RoleSeeder` +
`ModuleSeeder` — note `RefreshDatabase` is **not** enabled in `tests/Pest.php`
(commented out), so tests currently assume a pre-seeded DB with a known user
(e.g. `kmorbita`) already present rather than building fixtures per-test. Use
the `pest-testing` skill when writing/editing tests.

### Frontend

```bash
npm run dev     # Vite dev server
npm run build   # production build
```

No lint/format scripts are configured in `package.json` (no ESLint/Prettier
set up yet) — don't assume `npm run lint` exists.

## Architecture

### Auth: LDAP identity + app-side gating

Login authenticates against Active Directory via
`directorytree/ldaprecord-laravel` (`config/ldap.php`) — no local passwords.
On first login, LDAPRecord JIT-provisions a row in `users`
(`database/migrations/0001_01_01_000000_create_users_table.php`:
name/username/email/guid/domain) with `is_allowed` defaulting to `false`.

Being in AD is **not** sufficient to use the app. `is_allowed` is a separate,
app-only gate that a superadmin must flip — see
`app/Http/Middleware/EnsureUserIsAllowed.php` (aliased as `allowed` in
`bootstrap/app.php`) and `App\Console\Commands\GrantSuperadmin`
(`php artisan app:grant-superadmin <username>`, used to bootstrap the first
superadmin — creates the user record if they haven't logged in via LDAP yet).
Both `LoginController::store` and the `allowed` middleware independently
enforce this check (login-time and per-request).

### Authorization: roles + per-module permissions (Spatie)

Three fixed roles seeded by `RoleSeeder`: `superadmin`, `admin`, `bdd`.
`superadmin` bypasses all permission checks via a `Gate::before` in
`AppServiceProvider` — it is never assigned explicit permissions.

Beyond role, access is gated **per module** using Spatie permissions named
`operations.{module-slug}.view` (see `App\Models\Module::permissionName()`).
`ModuleSeeder` is the registry: adding a new module means adding an entry
there (which auto-creates its permission) *and* protecting its route with
`->middleware('can:operations.{slug}.view')` (see `routes/operations.php`).
Route-level checks always combine `auth` + `allowed` + the module's `can:`
permission — never rely on role alone for module access.

### Admin area: user access + per-role/per-user module permissions

`routes/admin.php` (prefix `/admin`, `superadmin` middleware only — see
`EnsureUserIsSuperadmin`) exposes two screens under
`app/Http/Controllers/Admin/`:

- `UserManagementController` (`Admin/Users/Index.tsx`) — list/filter synced
  AD users, flip `is_allowed` (calls `User::forceLogout()` when revoked),
  change role (`syncRoles`, one of `superadmin`/`admin`/`bdd`), delete a user.
  A superadmin can't change their own access/role or delete themselves
  (`abort_if($user->is(Auth::user()), ...)` guards in every method).
- `ModulePermissionController` (`Admin/Permissions/Index.tsx`) — grants Spatie
  permissions two ways: **role grants** (`updateRoleGrant`, only for `admin`/
  `bdd` — `superadmin` is excluded since `Gate::before` already bypasses every
  check for it) and **per-user overrides** on top of role
  (`grantUserOverride`/`revokeUserOverride`, via `Module::permissionName()`).
  This is the actual implementation of the "access control is per-user, not
  just per-role" requirement in `APP REQUIREMENT.md`.

### Route structure

- `routes/web.php` — auth/dashboard, loaded normally.
- `routes/operations.php` — one route (group) per module under
  `/operations/...`, loaded via the `then:` callback in `bootstrap/app.php`
  (not Laravel's default route discovery). Add new module routes here.
- `routes/admin.php` — also loaded via the same `then:` callback; superadmin-only
  user/permission management (see above).
- `routes/kiosk.php` — also loaded via the same `then:` callback; the **only**
  place public, unauthenticated routes exist (`['web']` middleware only, no
  `auth`/`allowed`/`can:`) — currently the Road Queue and Road Queue (ECD)
  live boards. See "Road Queue / Road Queue (ECD) modules" below before
  adding anything else here — this is a deliberate, narrow exception, not a
  precedent for skipping auth elsewhere.
- Controllers for modules live under `app/Http/Controllers/Operations/`;
  admin-area controllers under `app/Http/Controllers/Admin/`.

### Database connections

`config/database.php` defines a dedicated `sparcsn4` connection (driver
`sqlsrv`) alongside the default `mysql` app connection. `sparcsn4` is shared
across all future modules and is read-only — query it with bound parameters,
never string-concatenated SQL. App data (users, roles, modules, sessions,
queue/cache tables) lives in `mysql`.

### Module implementation status

Both Reefer Plug-in Report sub-views now run real, live queries against
`sparcsn4` via `DB::connection('sparcsn4')->select($sql, $bindings)` with
named bound parameters (never string-concatenated). `sparcsn4` uses a
self-signed cert — `config/database.php`'s `sparcsn4` connection sets
`trust_server_certificate` (env `DB_SQLSRV_TRUST_SERVER_CERTIFICATE`,
defaults `true`) or every query fails with an SSL cert-verify error under
ODBC Driver 18. PDO's `sqlsrv` driver also rejects reusing the same named
parameter at more than one placeholder in one query — both services bind a
uniquely-suffixed parameter per occurrence (e.g. `:date_from_1`,
`:date_from_2`) even when the value repeats.

Both open questions `APP REQUIREMENT.md` originally flagged for this query
were explicitly resolved by the stakeholder (don't re-litigate without
checking first):
- **Date-range clipping**: `ReeferPluginPerContainerService` (per-container)
  clips plug-in minutes to the selected `date_from`/`date_to` — a
  connect/disconnect pair only partially overlapping the range contributes
  just the overlapping minutes (see the `ConnectEvents`/`PluginPairs` CTEs
  clipping each pair's start/end before summing). `ReeferPluginPerCategoryService`
  (per-category) does **not** clip — it sums a unit's full plug-in time as
  long as its visit falls in range. These two intentionally differ; don't
  "fix" one to match the other.
- **`TOTAL_CONNECT_DISCONNECT` scoping**: unscoped in both — counts every
  connect/disconnect event ever recorded for the unit's `gkey`, not limited
  to the date range. Confirmed intentional for both views.

Both controllers require `date_from` before calling their service at all
(`ReeferPluginReportController` / `ReeferPluginPerCategoryController`) — an
unbounded query both times out and can outright error (`Arithmetic overflow`
from `DATEDIFF`) against the real dataset, confirmed while building
per-category. `date_to` defaults to the end of the current day when omitted
in both. Per-container fetches every matching row unpaginated from SQL and
sorts/paginates/computes `visit_index`/`total_visits` in PHP (an explicit
simplicity-over-scalability tradeoff — wide date ranges can return thousands
of rows into PHP memory per request; per-category avoids this by aggregating
down to 1-2 rows in SQL instead).

Duplicate container IDs across rows are intentional (a container can be
plugged in more than once per stay) — never de-duplicate by container ID
without checking with the user first; the UI is expected to surface repeats
via `visit_index`/`total_visits`, not hide them.

### Road Queue / Road Queue (ECD) modules

Ported from two standalone Laravel 10 apps (`xps-road-queue`,
`xps-road-queue-ecd`) that queried the same `sparcsn4` connection this app
already had wired up for Reefer — no new DB connection was needed. Each
module has **two** routes, split across two different auth postures:

- **Board** (`RoadQueueBoardController` / `RoadQueueEcdBoardController`,
  `routes/kiosk.php`, `/operations/road-queue/board` and
  `/operations/road-queue-ecd/board`) — deliberately **public, no auth at
  all**. This is a carried-over requirement from both source apps: an
  unattended wall-mounted TV display, not a bug. Never add `auth`/`allowed`/
  `can:` middleware to these two routes. On every load it also captures a
  snapshot into the module's two history tables (see below) — a capture
  failure is caught and logged, never allowed to break the board render.
- **History** (`RoadQueueHistoryController` / `RoadQueueEcdHistoryController`,
  `routes/operations.php`, `/operations/road-queue/history` and
  `/operations/road-queue-ecd/history`) — the normal, permission-gated
  pattern (`auth` + `allowed` + `can:operations.{slug}.view`), same as every
  other module.

Both routes are linked from `AppLayout.tsx`'s sidebar via `MODULE_NAV`
(`resources/js/lib/modules.ts`) — each Road Queue entry is `shape: 'group'`
with "Board"/"History" sub-items, the same expandable-group pattern Reefer
uses for its "Per Container"/"Per Category" sub-views. The Board route being
public doesn't mean logged-out-only: `HandleInertiaRequests::share()`
populates the `auth` prop unconditionally regardless of route middleware, so
both `Board.tsx` pages conditionally wrap their content in `AppLayout` when
`auth.user` is present — an authenticated user reaching Board via the
sidebar keeps the sidebar/header chrome, while an anonymous kiosk visitor
still gets the original standalone, chrome-free full-bleed page (each
`Board.tsx` builds its JSX into a `content` variable across all three
render states — error/empty/loaded — then returns
`auth.user ? <AppLayout>{content}</AppLayout> : content` at the end; the
inner wrapper divs also drop their own `min-h-screen` when auth-wrapped, to
avoid double-stacking height inside `AppLayout`'s own `min-h-screen` flex
shell). The two board URLs are also linked from `Auth/Login.tsx` (derived
from the same `MODULE_NAV`, filtered
to children labeled "Board") so a logged-out visitor can reach the live
board without an account.

Each module has its own pair of MySQL tables for captured history —
`road_queue_tat_history`/`road_queue_high_elapsed_transactions` and
`road_queue_ecd_tat_history`/`road_queue_ecd_high_elapsed_transactions` — kept
as 4 separate tables/models rather than 2 shared ones, since the two modules'
`high_elapsed_transactions` shapes genuinely differ (Road Queue has
`precheck_time`, no `trucking_company`; ECD has `truck_visit_entered_yard` +
`trucking_company`, no `precheck_time`; only Road Queue's `tat_history` has a
`status` discriminator for its two TAT metrics vs. ECD's one).

`App\Services\Operations\Support\PreviousShiftCalculator` is shared by both
modules' board services — it computes the *previous* 12-hour shift (Day
07:00–19:00 / Night 19:00–07:00) with the timezone **hardcoded to
`Asia/Manila`** regardless of `config('app.timezone')` (`UTC`) — this
reflects the terminal's actual operating shifts, don't "fix" it to use the
app timezone.

`App\Console\Commands\PurgeOperationsHistory`
(`operations:purge-history {--months=} {--dry-run}`, scheduled daily at
02:00 in `routes/console.php`) is one generic command shared by both
modules — it iterates `config('operations.history_models')` rather than
having a near-duplicate command per module, since the purge logic itself
(count/delete/dry-run/log) is identical infrastructure, not business logic.
Retention defaults to 6 months (`OPERATIONS_HISTORY_RETENTION_MONTHS` env,
matching both source apps).

**Known upstream quirk, preserved intentionally (confirmed with the user,
not a bug to fix)**: `xps-road-queue-ecd`'s board query has `unit.id as
container` commented out, so `RoadQueueEcdHighElapsedTransaction.container`
is always an empty string, and the ECD board UI has no Container column at
all (`RoadQueueEcdBoardService::fetchQueue()` / `Pages/Operations/RoadQueueEcd/Board.tsx`).
Don't uncomment it without checking first — this matches current production
behavior in the source app.

### Frontend structure

- `resources/js/app.tsx` — Inertia entry point; pages are resolved from
  `resources/js/Pages/**/*.tsx` by component name (e.g. Inertia render name
  `Operations/ReeferPluginReport/Index` → `Pages/Operations/ReeferPluginReport/Index.tsx`).
- `resources/js/Layouts/AppLayout.tsx` — shared sidebar shell, list defined in
  `lib/modules.ts`'s `MODULE_NAV` (see that file's structure below). Entry
  *shape* (expandable group vs. flat link) is still hardcoded rather than
  DB-driven — the `modules` table has no per-module nav-shape metadata today.
  Entry *visibility* is permission-filtered, though: `AppLayout.tsx` and
  `Pages/Modules.tsx` both hide a whole `MODULE_NAV` entry (group or flat)
  unless the user holds that module's `operations.{slug}.view` permission or
  is superadmin, via `moduleNavPermission()` in `lib/modules.ts` checked
  against `auth.user.permissions` (added to `HandleInertiaRequests::share()`
  as `$user->getAllPermissions()->pluck('name')`). A module's public board
  route (if it has one) is hidden along with the rest of its group when the
  user lacks that module's permission, even though the route itself stays
  reachable by direct URL — this mirrors the admin nav section's existing
  `auth.user?.roles.includes('superadmin')` pattern rather than adding a
  separate mechanism.
- `resources/js/Components/ui/` — reusable primitives (Button, Input, Label,
  Select, Badge, Card, Pagination). Reuse these for new pages rather than
  writing one-off markup; see `[[feedback_ui_design_system]]` conventions
  (slate+indigo palette, compact spacing, `lucide-react` icons).
- `resources/js/Components/History/` — presentational components shared by
  the Road Queue and Road Queue (ECD) history pages (`TatHistoryTable`,
  `HighElapsedTransactionsTable`, `HistoryFilterBar`, `CsvExportButton`,
  `formatters.ts`) — the two modules' history dashboards are ~90% identical
  UI shape, so the presentation layer is shared while each module keeps its
  own Controller/Service/route/permission. The two Board pages
  (`Pages/Operations/RoadQueue/Board.tsx`, `.../RoadQueueEcd/Board.tsx`) are
  standalone, full-bleed kiosk pages and deliberately do **not** use
  `AppLayout` (same precedent as `Auth/Login.tsx`).
- `resources/js/types/index.d.ts` — shared Inertia prop types (`SharedProps`,
  `AuthUser`). `HandleInertiaRequests::share()` on the backend is the source
  of truth for what's actually in `auth` — keep both in sync when changing
  shared props.
- Path alias `@/*` → `resources/js/*` (see `tsconfig.json` / `vite.config.js`).
- Filter-driven UI (date range, category) should use Inertia's
  `router.get(..., { preserveState: true, only: [...] })` partial reloads
  rather than full page reloads, per `APP REQUIREMENT.md`.
