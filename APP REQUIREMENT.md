# DICT Operations Suite

## Project Overview
A Laravel 13 + InertiaJS (React) + TailwindCSS web app for DICT (Davao International
Container Terminal, Inc.) operations. Intended to grow into a multi-module
Operations Suite over time; the **first module** is the Reefer Plug-In Hours
Report, which determines how many hours reefer (refrigerated) containers have
been plugged in at the terminal over a user-selected date range, so Operations
can monitor and audit plug-in duration.

Data source is the Navis SPARCS N4 SQL Server database (`sparcsn4`). This is a
**read-only reporting app** — no writes back to N4.

### Multi-module scope
Build this with room to grow rather than as a single-purpose reefer app:
- Route namespace modules under `/operations/...`, e.g.
  `/operations/reefer-plugin-report`, so future modules (gate activity, vessel
  turnaround time, etc.) slot in alongside it.
- Use a shared layout/nav shell in React (sidebar or top nav) with room for
  future modules, even though only one module exists today.
- Keep module logic in dedicated Service classes (e.g.
  `ReeferPluginReportService`) rather than one growing catch-all service, so
  future modules get their own service classes.
- The SQL Server (`sparcsn4`) connection config should stay shared/central
  since future modules will likely query the same N4 database.

## Tech Stack
- **Backend:** Laravel 13, PHP
- **Frontend:** InertiaJS + React (functional components, hooks)
- **Styling:** TailwindCSS
- **Database:** SQL Server (`sqlsrv` / `sqlsrv` PDO driver) — connecting to `sparcsn4`
- **Auth:** `directorytree/ldaprecord-laravel` — syncs with Active Directory for
  login (see Authentication & Authorization section below)
- Follow existing patterns from other DICT internal tools (Vessel Operations
  Dashboard, DICT-BOC API Manager) where applicable — Laravel 13 + React +
  TypeScript conventions.

## Authentication & Authorization

### Login: LDAP via ldaprecord-laravel
- Use `directorytree/ldaprecord-laravel` to sync with the domain (Active
  Directory) for login. Users authenticate with their existing AD credentials
  — no separate password storage/management in this app.
- Domain: `anflocor.local` (base DN `dc=anflocor,dc=local`), plain LDAP on
  port 389 (no SSL/TLS in this environment).
- `.env` config (host/username/password below are placeholders — real
  IP and service account credentials to be filled in later, do not commit
  real values):

```dotenv
LDAP_LOGGING=true
LDAP_CONNECTION=default
LDAP_CONNECTIONS=default

LDAP_DEFAULT_HOSTS=192.168.11.249
LDAP_DEFAULT_USERNAME=dictdevuser@anflocor.local
LDAP_DEFAULT_PASSWORD=r32cbHXWJ4DYAj
LDAP_DEFAULT_PORT=389
LDAP_DEFAULT_BASE_DN="dc=anflocor,dc=local"
LDAP_DEFAULT_TIMEOUT=5
LDAP_DEFAULT_SSL=false
LDAP_DEFAULT_TLS=false
```

- AD is used for **identity/authentication only**. Access control (who is
  *allowed* to log in at all, and what they can see once in) is **not**
  configured on the AD side — it's fully managed inside this app.
  - This is a deliberate choice: don't rely on AD group membership or AD-side
    login restrictions to gate access. Every user who exists in AD can
    technically authenticate; whether they're actually let into the app is
    an app-level decision (see Roles below).
- On first login (JIT provisioning), sync the AD user into a local `users`
  table (name, username/samaccountname, email, etc.) plus an `is_active` /
  `is_allowed` flag that starts `false` — the user exists but has no access
  until explicitly enabled by a superadmin.

### Roles
Three roles, superadmin at the top:
- **superadmin**
  - Full access to everything in the app, all modules, all data.
  - Exclusively controls **who is allowed to log in** — since login isn't
    gated on the AD side, superadmin is the only role that can flip a synced
    AD user from "exists but blocked" to "allowed in."
  - Manages role assignment (who is admin, who is bdd) and fine-grained
    per-user access (see below) — this is separate from AD, fully DB-driven.
- **admin**
  - Broad operational access, scope to be defined per module as the suite
    grows. Not able to grant/revoke login access or manage other users'
    permissions — that stays superadmin-only unless we decide otherwise.
- **bdd**
  - Narrower role (business/data/dept-specific — confirm exact meaning and
    scope with me). Access limited to specific modules/reports as configured.

### Access control is per-user, not just per-role
- Role determines a baseline, but **superadmin must be able to control access
  at a finer grain than role alone** — e.g. grant/revoke a specific user's
  access to a specific module (reefer plug-in report today, other modules
  later) independent of their role.
- Suggested approach: a permissions layer on top of roles (e.g. Spatie
  `laravel-permission` for role+permission management, or a custom
  `user_module_access` pivot table mapping users to modules/reports they can
  see) — confirm which approach before building, since this affects the data
  model for every future module.
- Every module route/controller should check both role AND explicit
  per-user/module access rather than role alone.

## Business Context
- Reefer containers get "plugged in" (event_type_gkey = 32, connect) and later
  "unplugged" (event_type_gkey = 33, disconnect) while at the yard.
- A container can be plugged in more than once during its stay (e.g. plugged in,
  unplugged, gated out, returned to the terminal, plugged in again). This means
  **the same container ID can legitimately appear more than once** in results —
  this is NOT a data bug, it must be shown/handled deliberately (see below).
- Containers are categorized as:
  - `IMPRT` — Import
  - `EXPRT` — Export
- Business wants to filter/report on these categories, and the current raw SQL
  mixes both into one `IN ('EXPRT','IMPRT')` filter — **this needs to become a
  user-selectable filter** (see Requirements).
- "Currently plugged in" containers are those with a connect event but no
  matching disconnect event yet — the query uses `GETDATE()` as a fallback end
  time for these, so their plug-in hours grow until they're disconnected.

## Core Query (starting point — SQL Server / T-SQL)

Connection config (`.env` — host/database/credentials below are placeholders,
real values to be filled in later, do not commit real values):

```dotenv
DB_SQLSRV_HOST=192.168.11.211
DB_SQLSRV_PORT=1433
DB_SQLSRV_DATABASE=sparcsn4
DB_SQLSRV_USERNAME=tosreports
DB_SQLSRV_PASSWORD=tosreports
```

```sql
WITH PluginPairs AS (
    SELECT
        connect_event.applied_to_gkey,
        DATEDIFF(MINUTE,
            connect_event.placed_time,
            ISNULL(
                (
                    SELECT TOP 1 disconnect_event.placed_time
                    FROM [sparcsn4].[dbo].[srv_event] AS disconnect_event
                    WHERE disconnect_event.applied_to_gkey = connect_event.applied_to_gkey
                      AND disconnect_event.event_type_gkey = '33'
                      AND disconnect_event.placed_time > connect_event.placed_time
                    ORDER BY disconnect_event.placed_time ASC
                ),
                GETDATE()
            )
        ) AS plugin_minutes
    FROM [sparcsn4].[dbo].[srv_event] AS connect_event
    WHERE connect_event.event_type_gkey = '32'
),
PluginHours AS (
    SELECT
        applied_to_gkey,
        SUM(plugin_minutes) AS TOTAL_PLUGIN_MINUTES
    FROM PluginPairs
    GROUP BY applied_to_gkey
)
SELECT
    unit.gkey,
    (
        SELECT COUNT(*)
        FROM [sparcsn4].[dbo].[srv_event]
        WHERE applied_to_gkey = unit.gkey
          AND (event_type_gkey = '32' OR event_type_gkey = '33')
    ) AS TOTAL_CONNECT_DISCONNECT,
    ISNULL(ph.TOTAL_PLUGIN_MINUTES, 0) AS TOTAL_PLUGIN_MINUTES,
    ROUND(ISNULL(ph.TOTAL_PLUGIN_MINUTES, 0) / 60.0, 2) AS TOTAL_PLUGIN_HOURS,
    unit.id AS container,
    fcy_visit.transit_state AS transit_state,
    unit.category,
    unit.freight_kind,
    bizunit.id AS line_op,
    eq_type.id AS type_iso
FROM [sparcsn4].[dbo].[inv_unit] AS unit
INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit
    ON unit.gkey = fcy_visit.unit_gkey
INNER JOIN [sparcsn4].[dbo].[ref_equipment] AS ref
    ON unit.eq_gkey = ref.gkey
INNER JOIN [sparcsn4].[dbo].[ref_equip_type] AS eq_type
    ON ref.eqtyp_gkey = eq_type.gkey
INNER JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] AS bizunit
    ON unit.line_op = bizunit.gkey
LEFT JOIN PluginHours AS ph
    ON ph.applied_to_gkey = unit.gkey
WHERE
    fcy_visit.time_in >= '2026-06-01 00:00:00'
    AND unit.category IN ('EXPRT','IMPRT')
    AND unit.freight_kind = 'FCL'
    AND ref.rfr_type = 'INTEG_AIR'
```

### Known caveats in the query above (flag, don't silently "fix")
- `TOTAL_CONNECT_DISCONNECT` counts ALL connect/disconnect events ever recorded
  for the unit's `gkey`, not scoped to the date range — worth confirming with
  the business whether that's intended, since `gkey` may get reused/rejoined
  across separate terminal visits (this ties into the "duplicate container"
  behavior noted above).
- `PluginPairs` pairs each connect event with the *next* disconnect event
  after it, regardless of which visit it belongs to. If a container has
  multiple stays, this pairing logic needs to be sound — worth a data sanity
  check early in development rather than assuming it's correct.
- No date range filter currently applied inside `PluginPairs`/`PluginHours`
  themselves — only `fcy_visit.time_in` is filtered on the outer query. Confirm
  whether plug-in hours should only count time within the selected range, or
  total plug-in time for any unit whose visit started in that range.

## Feature Requirements

### 1. Date Range Filter
- Replace the hardcoded `fcy_visit.time_in >= '2026-06-01 00:00:00'` with a
  user-selected **from / to** date range.
- Default: no default range hardcoded in the UI — but during development,
  seed/test against a sensible recent range (e.g. last 30 days).
- Should support open-ended ranges ("from X to whenever possible" per the
  original ask) — i.e. `to` date should be optional.

### 2. Category Filter (IMPRT / EXPRT)
- Replace `unit.category IN ('EXPRT','IMPRT')` with a UI control that lets the
  user pick: Import only, Export only, or Both.
- Default: Both.

### 3. Duplicate Containers
- Because a container ID can appear more than once (re-plugged after gate-out
  and return), the UI should make this visible rather than hide it — e.g. show
  each row as a distinct plug-in event/visit, and consider a visual indicator
  or grouping when the same container ID appears multiple times in the result
  set for the selected range.
- Do not silently de-duplicate by container ID without checking with me first.

### 4. Results Display
- Table showing at minimum: container ID, category (IMPRT/EXPRT), transit
  state, total plug-in hours, total connect/disconnect count, line operator,
  ISO type.
- Sortable columns, sensible pagination (this query can return a lot of rows
  over long date ranges).
- Consider a summary/aggregate header (e.g. total containers, avg plug-in
  hours) — confirm with me before building this out.

## Suggested Architecture
- **Backend**
  - Dedicated SQL Server connection config in `config/database.php` (separate
    connection name, e.g. `sparcsn4`), using `sqlsrv` driver.
  - A Service class (e.g. `ReeferPluginReportService`) to build/execute the
    query with bound parameters for date range and category — do not
    string-concatenate user input into SQL.
  - Controller + route (e.g. `GET /operations/reefer-plugin-report`) returning an Inertia
    response with initial data, plus an API-style endpoint or Inertia partial
    reload for filter changes.
- **Frontend**
  - React page component rendering a filter bar (date range picker + category
    select) and a results table.
  - Use Inertia's `router.get` with `preserveState`/`only` for filter-driven
    partial reloads rather than full page reloads.
  - TailwindCSS for styling, consistent with other DICT internal tools.

## Open Questions To Confirm Before/During Build
1. Should plug-in hours be clipped to the selected date range, or always show
   full plug-in duration for any unit whose visit started in range?
2. Should `TOTAL_CONNECT_DISCONNECT` be scoped to the date range too?
3. Expected data volume per typical date range (affects pagination/query
   performance decisions)?
4. Confirm exact meaning/scope of the **bdd** role — which modules/data should
   it see by default?
5. Permissions approach: Spatie `laravel-permission` (roles + permissions) vs.
   a custom per-user/module access table — which fits better long-term as more
   modules are added?

## Environment / Secrets
- Real LDAP and SQL Server credentials (host IPs, service account, passwords)
  are **not** included in this doc — only placeholder `.env` shapes are shown
  above. Real values will be filled directly into `.env` locally and must
  never be committed to git.

## Non-Goals
- No writing/updating data back to `sparcsn4` / Navis N4.
- No local password management — auth identity comes from AD via LDAP; this
  app only manages login-allow status, roles, and module-level access.