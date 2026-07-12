# FootStream

FootStream is a football team and match-management platform. This repository currently implements **Phases 1 through 5 plus Phases 6A through 6F**: the MERN foundation, administration, permanent squads, match scheduling, live match control, results, photos, statistics, YouTube streaming, the public portal, team/player profiles, global public search, SPA metadata, sharing, accessibility, production readiness, direct image uploads, live-event overlays, team branding uploads, and public team join requests.

Deployment execution, community interaction features, payments, AI features, tournaments, mobile apps, and Phase 7/8 functionality are intentionally not included.

## Phase 1 Features

- JavaScript-only React and Express applications managed with npm.
- JWT authentication stored in an HTTP-only cookie.
- Password hashing with `bcryptjs`.
- Two roles: `superAdmin` and `teamAdmin`.
- No registration endpoint or public account creation.
- Super-admin seed command.
- Super-admin team creation and team listing.
- Super-admin creation, listing, enabling, and disabling of team-admin accounts.
- Team-admin access restricted to the assigned team.
- Responsive login, dashboard, unauthorized, loading, and not-found experiences.
- Request validation, centralized error handling, security headers, CORS, login rate limiting, and structured API responses.
- Health endpoint with honest MongoDB connection status.

## Phase 2 Features

- Permanent player cards owned by a team.
- Team-admin create, read, edit, availability, activation, and soft-delete workflows.
- Strict ownership: team IDs are derived from the authenticated team-admin account.
- Search and position, availability, and active-state filters.
- Unique active jersey numbers within each team.
- One active captain and one active vice-captain per team.
- Read-only super-admin squad viewing.
- URL-based photos with a resilient fallback avatar.
- Responsive squad summaries, cards, validation, loading, empty, and error states.

## Phase 3 Features

- Team-admin scheduling for owned teams with name-only opponents.
- Optional temporary opponent player names stored inside a match.
- Exactly 11 unique starters and optional non-overlapping substitutes.
- Eligibility checks against active, available permanent players.
- Immutable match-day player snapshots for historical display.
- Scheduled-match editing, cancellation, and soft deletion.
- Upcoming-first match ordering with past fixtures ordered newest-first.
- Read-only super-admin match lists and match details.
- Responsive match filters, multi-section forms, player selectors, review summaries, and detail pages.

## Phase 4 Features

- Safe scheduled → first half → half-time → second half → completed transitions.
- Anchored match timer using persisted base seconds rather than database writes every second.
- Append-only goals, assisted goals, cards, substitutions, penalties, and own goals.
- Score recalculation from active scoring events after every event and undo.
- Current on-field, bench, sent-off, and substitution state rebuilt from the saved lineup and active events.
- Atomic per-match event sequence allocation through `Match.lastEventSequence`.
- Latest-active-event undo with history preservation and optional reason.
- Socket.IO match rooms for state, event, undo, and transition updates.
- Responsive team-admin live control, public `/live/:matchId`, and read-only super-admin oversight.

## Phase 5 Features

- Final score and outcome calculation from non-undone scoring events; clients cannot submit protected score or winner fields.
- Man of the Match restricted to the saved own-team match squad, plus attendance and completion notes.
- Direct Cloudinary match-photo uploads with captions, categories, validation, previews, editing, and storage-first deletion.
- Player career statistics derived from completed matches, lineup snapshots, and active events instead of mutable counters.
- Team record, goals for/against, goal difference, rounded win percentage, deterministic leaderboards, and filterable history.
- Team-admin management, super-admin read-only oversight, and anonymous public result/statistics/history pages.

## Phase 6A Features

- Owning team administrators can add, update, enable, disable, preview, and remove a match YouTube stream configuration.
- Approved YouTube watch, short, live, and embed URLs are normalized server-side to an 11-character video ID and `https://www.youtube.com/embed/VIDEO_ID`.
- Raw iframe markup, scripts, HTTP URLs, lookalike hosts, malformed URLs, and client-supplied protected stream fields are rejected.
- Public playback responses hide the source URL and ownership metadata; disabled, cancelled, and inactive matches are never playable.
- Super administrators have a read-only stream endpoint.

## Phase 6B Features

- A dedicated responsive public layout with Home, Live, Fixtures, Results, Login/Dashboard navigation, mobile controls, and a footer.
- API-driven home sections for live matches, nearest fixtures, and latest completed results, each limited to six entries.
- Anonymous live, fixture, and result directories with bounded queries, deterministic ordering, filters, empty/error/loading states, and pagination.
- A status-aware public match page for scheduled, live, half-time, completed, and cancelled matches.
- The individual live page combines the existing Socket.IO scoreboard/timeline with safe YouTube playback, reconnect synchronization, lineups, and native-share/clipboard fallback.
- Existing `/live/:matchId` and Phase 5 result/statistics URLs remain available inside the public layout.
- Public portal discovery includes only active matches belonging to published, non-archived teams and returns explicit public-safe objects rather than raw Mongoose documents.

## Phase 6C Features

- Published-team directory with team-name and city filtering, derived match/win totals, top scorer, and bounded pagination.
- Slug-based team profiles with cover image, logo, public identity, social links, verified statistics, leaders, next fixture, latest result, and gallery preview.
- Published team profiles show a prominent Instagram follow action when the super-admin profile editor has saved a valid `instagram.com` link.
- Active-only public squad cards with leadership badges and no availability or administrative state.
- Team-specific upcoming fixtures, completed results, and categorized match-photo gallery pages.
- Public player profiles with identity, team, football/academic details, leadership, career statistics, awards, and recent completed match squads.
- A protected super-admin team-profile editor controls optional public fields and publication status for existing teams.
- Public serializers omit administrative ownership, account data, availability, Cloudinary identifiers, and unrelated database identifiers.

## Phase 6D Features

- Global anonymous search across published teams, active public players, and active public matches with grouped or type-specific results.
- Exact-name, prefix, and remaining-name ranking for teams and players; live, upcoming, and completed ordering for matches.
- Debounced URL-synchronized `/search` page, result counts, type controls, pagination, and accessible header suggestions.
- Dynamic SPA titles, descriptions, canonical URLs, Open Graph fields, and Twitter fields using public-safe content only.
- Reusable native-share control with clipboard and manual-copy fallbacks on teams, players, fixtures, live matches, and results.
- Skip navigation, route focus management, keyboard-operable menus/suggestions, breadcrumbs, live announcements, visible focus treatment, and reduced-motion support.
- Lazy-loaded larger public routes, lazy below-the-fold images, and a more useful branded public 404 experience.

## Phase 6F Features

- Published teams can accept public join requests without requiring public accounts.
- Public applicants submit contact details, football/academic details, motivation, highlights, and an optional photo.
- Public applicants never provide a jersey number; official jersey numbers are assigned only by the team admin during approval.
- Applicants receive a private request code and can check a safe status page without exposing email, phone, reviewer, or internal approval data.
- Duplicate pending requests by the same email or phone are blocked per team.
- Team admins can list, review, approve, and reject only their own team's requests.
- Approval creates one official squad player with the team-admin-assigned jersey number and prevents duplicate review of an already processed request.
- Rejection removes the applicant's temporary Cloudinary photo asset before marking the request rejected.
- Super admins can inspect join requests read-only for oversight.
- Public search does not index or expose join requests.

## Technology

### Backend

Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, bcryptjs, express-validator, Multer, Cloudinary, cookie-parser, Helmet, CORS, Morgan, dotenv, and express-rate-limit.

### Frontend

React, Vite, Tailwind CSS, React Router, Axios, Socket.IO Client, Context API, and Lucide React.

## Folder Structure

```text
footstream/
|-- backend/
|   |-- scripts/
|   |   `-- seedAdmin.js
|   |-- src/
|   |   |-- config/
|   |   |   |-- database.js
|   |   |   `-- env.js
|   |   |-- controllers/
|   |   |   |-- adminController.js
|   |   |   |-- authController.js
|   |   |   |-- healthController.js
|   |   |   `-- teamController.js
|   |   |-- middleware/
|   |   |   |-- auth.js
|   |   |   |-- errorHandler.js
|   |   |   |-- ownership.js
|   |   |   `-- validate.js
|   |   |-- models/
|   |   |   |-- Match.js
|   |   |   |-- MatchEvent.js
|   |   |   |-- Player.js
|   |   |   |-- Team.js
|   |   |   `-- User.js
|   |   |-- services/
|   |   |   |-- liveMatchService.js
|   |   |   |-- matchService.js
|   |   |   `-- playerService.js
|   |   |-- routes/
|   |   |   |-- adminRoutes.js
|   |   |   |-- authRoutes.js
|   |   |   |-- healthRoutes.js
|   |   |   `-- teamRoutes.js
|   |   |-- utils/
|   |   |   |-- AppError.js
|   |   |   |-- asyncHandler.js
|   |   |   |-- slugify.js
|   |   |   `-- token.js
|   |   |-- validators/
|   |   |   |-- adminValidators.js
|   |   |   |-- authValidators.js
|   |   |   |-- matchValidators.js
|   |   |   |-- liveMatchValidators.js
|   |   |   `-- playerValidators.js
|   |   |-- app.js
|   |   `-- server.js
|   |-- test/
|   |   |-- matchService.test.js
|   |   |-- playerService.test.js
|   |   `-- slugify.test.js
|   |-- .env.example
|   |-- eslint.config.js
|   |-- package-lock.json
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |   `-- client.js
|   |   |-- components/
|   |   |   |-- Brand.jsx
|   |   |   |-- EmptyState.jsx
|   |   |   |-- LoadingScreen.jsx
|   |   |   `-- Modal.jsx
|   |   |-- context/
|   |   |   `-- AuthContext.jsx
|   |   |-- features/
|   |   |   |-- live/
|   |   |   |-- matches/
|   |   |   `-- squad/
|   |   |-- layouts/
|   |   |   `-- DashboardLayout.jsx
|   |   |-- pages/
|   |   |   |-- LoginPage.jsx
|   |   |   |-- NotFoundPage.jsx
|   |   |   |-- SuperAdminDashboard.jsx
|   |   |   |-- TeamAdminDashboard.jsx
|   |   |   `-- UnauthorizedPage.jsx
|   |   |-- routes/
|   |   |   |-- ProtectedRoute.jsx
|   |   |   `-- RoleRoute.jsx
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   `-- styles.css
|   |-- .env.example
|   |-- eslint.config.js
|   |-- index.html
|   |-- package-lock.json
|   |-- package.json
|   `-- vite.config.js
|-- .gitignore
|-- PLAN.md
`-- README.md
```

## API List

All responses are JSON. Protected requests use the JWT cookie set by login.

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | API and MongoDB health status |
| `POST` | `/api/auth/login` | Public | Authenticate an active administrator and set the JWT cookie |
| `POST` | `/api/auth/logout` | Public | Clear the authentication cookie |
| `GET` | `/api/auth/me` | Authenticated | Return the current administrator |
| `GET` | `/api/admin/teams` | superAdmin | List active teams |
| `POST` | `/api/admin/teams` | superAdmin | Create a team |
| `GET` | `/api/admin/teams/:teamId/players` | superAdmin | View a team's squad read-only |
| `GET` | `/api/admin/teams/:teamId/join-requests` | superAdmin | Read-only join requests for one team |
| `GET` | `/api/admin/join-requests/:requestId` | superAdmin | Read-only join request detail |
| `GET` | `/api/admin/matches` | superAdmin | List all active matches with filters |
| `GET` | `/api/admin/matches/:matchId` | superAdmin | View one match and lineup snapshots |
| `GET` | `/api/admin/team-admins` | superAdmin | List team administrators |
| `POST` | `/api/admin/team-admins` | superAdmin | Create and assign a team administrator |
| `PATCH` | `/api/admin/team-admins/:userId/status` | superAdmin | Enable or disable a team administrator |
| `GET` | `/api/team/current` | teamAdmin | Return the authenticated admin's assigned team |
| `PATCH` | `/api/team/profile/join-requests-status` | teamAdmin | Enable or disable public join requests for the assigned team |
| `GET` | `/api/team/players` | teamAdmin | List owned players with optional filters |
| `POST` | `/api/team/players` | teamAdmin | Add a player to the assigned team |
| `GET` | `/api/team/players/:playerId` | teamAdmin | Get one owned player |
| `PATCH` | `/api/team/players/:playerId` | teamAdmin | Update allowed player-card fields |
| `PATCH` | `/api/team/players/:playerId/status` | teamAdmin | Change availability or active state |
| `DELETE` | `/api/team/players/:playerId` | teamAdmin | Soft-delete an owned player |
| `GET` | `/api/team/matches` | teamAdmin | List owned matches with filters |
| `POST` | `/api/team/matches` | teamAdmin | Schedule a match and build lineup snapshots |
| `GET` | `/api/team/matches/:matchId` | teamAdmin | View one owned match |
| `PATCH` | `/api/team/matches/:matchId` | teamAdmin | Edit an owned scheduled match |
| `PATCH` | `/api/team/matches/:matchId/cancel` | teamAdmin | Cancel an owned scheduled match |
| `DELETE` | `/api/team/matches/:matchId` | teamAdmin | Soft-delete an owned scheduled match |
| `GET` | `/api/team/join-requests` | teamAdmin | List owned public join requests |
| `GET` | `/api/team/join-requests/:requestId` | teamAdmin | Review one owned public join request |
| `PATCH` | `/api/team/join-requests/:requestId/approve` | teamAdmin | Approve a pending request into the official squad |
| `PATCH` | `/api/team/join-requests/:requestId/reject` | teamAdmin | Reject a pending request and clean applicant photo storage |
| `POST` | `/api/team/matches/:matchId/start` | teamAdmin | Start an owned scheduled match |
| `POST` | `/api/team/matches/:matchId/end-first-half` | teamAdmin | Pause at half-time |
| `POST` | `/api/team/matches/:matchId/start-second-half` | teamAdmin | Resume the second half |
| `POST` | `/api/team/matches/:matchId/complete` | teamAdmin | Complete and lock a live match |
| `GET` | `/api/team/matches/:matchId/live-state` | teamAdmin | Get owned live state and current lineup |
| `GET` | `/api/team/matches/:matchId/events` | teamAdmin | Get the complete event timeline including undone events |
| `POST` | `/api/team/matches/:matchId/events/goal` | teamAdmin | Add a goal with optional assist |
| `PATCH` | `/api/team/matches/:matchId/events/:eventId/assist` | teamAdmin | Attach an assist to an eligible goal |
| `POST` | `/api/team/matches/:matchId/events/yellow-card` | teamAdmin | Add a yellow card |
| `POST` | `/api/team/matches/:matchId/events/red-card` | teamAdmin | Add a red card |
| `POST` | `/api/team/matches/:matchId/events/substitution` | teamAdmin | Make a valid bench-to-field substitution |
| `POST` | `/api/team/matches/:matchId/events/penalty` | teamAdmin | Add a scored, missed, or saved penalty |
| `POST` | `/api/team/matches/:matchId/events/own-goal` | teamAdmin | Add an own goal and credit the opposite side |
| `POST` | `/api/team/matches/:matchId/events/undo-last` | teamAdmin | Undo the latest active event |
| `GET` | `/api/admin/matches/:matchId/live-state` | superAdmin | Read-only live oversight state |
| `GET` | `/api/admin/matches/:matchId/events` | superAdmin | Read-only event history |
| `GET` | `/api/public/matches/:matchId/live` | Public | Sanitized public live state |
| `GET` | `/api/public/matches/:matchId/events` | Public | Active public event timeline |
| `POST` | `/api/public/teams/:teamSlug/join-requests` | Public | Submit a public request to join a published team |
| `GET` | `/api/public/join-requests/:requestCode/status` | Public | Check a join request by private request code |

There is deliberately no registration API.

The player list accepts `search`, `position`, `availabilityStatus`, and `isActive` query parameters. Team-admin endpoints never accept a team ID; the API always uses the team assigned to the authenticated account.

## Squad Management Usage

Team administrators open `/team/squad` to review squad totals, search and filter permanent records, maintain player cards, update availability, and deactivate or reactivate players.

Super administrators use the eye action beside a team in the control room to open its read-only squad. They cannot create or edit players.

Jersey numbers can be reused only after the previous holder is inactive. Deactivating a captain or vice-captain clears the leadership assignment. A player cannot hold both leadership roles.

## Match Scheduling Usage

Team administrators open `/team/matches` to create and manage scheduled fixtures. The client sends only player IDs; the API verifies every selection and stores independent lineup snapshots. Later player-card edits therefore do not alter existing match details.

Only scheduled matches may be edited, cancelled, or deleted. Cancellation records `cancelledAt`. Deletion uses `isActive=false` and hides the record from active match lists. Team admins cannot mark matches completed during Phase 3.

The match list supports `status`, `matchType`, `from`, `to`, and `search`. Super-admin lists additionally support `teamId`. Upcoming fixtures are ordered by kickoff ascending, followed by past fixtures ordered descending.

## Live Architecture and Event Rules

All mutations use authenticated REST routes. Socket.IO provides read-only real-time delivery and never grants mutation authority.

The timer persists `timerBaseSeconds` and `timerAnchorAt` only on state changes. Clients calculate seconds between anchors locally, preventing continuous database writes.

The scoreboard is derived only from active `goal`, `penalty_scored`, and `own_goal` events. Missed/saved penalties and undone events do not count. Home and away scores are mapped from the FootStream team's `teamSide`.

Own-team event players are resolved exclusively from saved match-day snapshots. Later profile edits, availability changes, or deactivation do not alter historical eligibility or display values. Substitution and red-card state is rebuilt by replaying active events from the saved Starting XI.

Events are never deleted. Undo marks only the latest active event with `isUndone`, `undoneAt`, `undoneBy`, and an optional reason before recalculating the score and current lineup.

### Consistency Strategy

- `Match.lastEventSequence` is incremented atomically with `findOneAndUpdate`, preventing sequence collisions.
- The unique `{ match, sequence }` event index provides a second database guarantee.
- Event data is written before deterministic score recalculation.
- REST and socket live-state serializers independently derive scores from active events, so a later read remains correct even if a stored-score update is interrupted.
- Frontend mutation buttons are disabled while requests are pending to reduce duplicate rapid submissions.
- No transactions are required, keeping local standalone MongoDB development reliable.

## Socket.IO Contract

Clients join and leave `match:<matchId>` rooms with:

- `join-match`
- `leave-match`

Server events:

- `match:state` — complete sanitized current live state
- `match:event-created` — created/updated event plus current state
- `match:event-undone` — undone event plus corrected state
- `match:transition` — state transition plus current state
- `match:error` — safe room-join error only

Clients automatically reconnect and refetch REST state after connection, preventing stale socket-only state.

## Public Live View

Open `/live/:matchId` without signing in. The page displays the scoreboard, timer, period, venue, tournament, current lineup, bench, sent-off players, substitutions, connection status, and active event timeline.

## Prerequisites

- Node.js 20 or newer.
- npm.
- MongoDB Community Server running locally on `127.0.0.1:27017`, or another MongoDB connection configured in `backend/.env`.

## Environment Configuration

Copy each example file before starting the applications:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Edit `backend/.env` and replace at least:

- `JWT_SECRET` with a cryptographically random value of at least 32 characters;
- `SUPER_ADMIN_EMAIL` with the initial administrator email;
- `SUPER_ADMIN_PASSWORD` with a strong initial password;
- `MONGODB_URI` if MongoDB is not at the default local address.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from a free Cloudinary account to enable match-photo uploads.
- `CLOUDINARY_FOLDER` if the default `footstream/matches` root should be changed.

The default frontend API URL is `http://localhost:5000/api`. Set `VITE_PUBLIC_APP_URL=http://localhost:5173` in `frontend/.env` so canonical metadata and share links use the intended public origin. Local development falls back to `window.location.origin` when this value is absent or invalid. Do not place a fake production domain here. The backend permits `http://localhost:5173` by default.

Cloudinary credentials belong only in `backend/.env`. Photos are uploaded under `<CLOUDINARY_FOLDER>/<matchId>/`; MongoDB stores searchable metadata, not image bytes.

Never commit either `.env` file.

## Install Dependencies

```powershell
Set-Location backend
npm install

Set-Location ../frontend
npm install
```

## Create the Super Admin

Start MongoDB, configure `backend/.env`, then run:

```powershell
Set-Location backend
npm run seed:admin
```

The command is safe to run again. If the configured super-admin email already exists with the correct role, it exits without creating a duplicate.

## Run Locally

Open two terminals from the repository root.

Backend:

```powershell
Set-Location backend
npm run dev
```

Frontend:

```powershell
Set-Location frontend
npm run dev
```

Open `http://localhost:5173` and sign in with the seeded super-admin credentials.

## Validation Commands

Backend:

```powershell
Set-Location backend
npm run lint
npm run check
npm test
```

Frontend:

```powershell
Set-Location frontend
npm run lint
npm run build
```

## Production Notes

- Set `NODE_ENV=production`.
- Use HTTPS so the authentication cookie can be marked secure.
- Use a long random JWT secret and keep it outside source control.
- Set `CLIENT_URL` to the exact frontend origin.
- Use a maintained MongoDB database with backups.
- Run the frontend production build and serve `frontend/dist` from a static host.
- Run the backend with `npm start` behind a reverse proxy or managed Node.js host.

Deployment configuration is reserved for a later milestone and is not included in Phase 6C.

## Manual Phase 2 Test Checklist

1. Sign in as the super admin and create two teams with one team-admin account each.
2. Sign in as the first team admin and open **Squad**.
3. Add a player with a valid position, jersey number, and optional image URL.
4. Verify the summary cards and player card update.
5. Add a captain, then confirm a second captain is rejected clearly.
6. Confirm a duplicate active jersey number is rejected.
7. Edit the player, change availability, and verify each filter.
8. Deactivate the player and confirm it appears under **Inactive only** with leadership removed.
9. Sign in as the other team admin and confirm the first team's players are inaccessible.
10. Sign in as the super admin and open each team's read-only squad view.

## Manual Phase 3 Test Checklist

1. Give a team at least 11 active, available permanent players.
2. Sign in as its team admin and open **Matches**.
3. Create a fixture with opponent, venue, future kickoff, type, side, formation, and exactly 11 starters.
4. Add optional substitutes and temporary opponent names, then review and save.
5. Open match details and verify snapshot names, numbers, positions, photos, and leadership badges.
6. Edit a permanent player card and confirm the saved match snapshot does not change.
7. Try selecting an injured, suspended, unavailable, inactive, duplicate, or cross-team player through the API and confirm rejection.
8. Edit the scheduled fixture and verify snapshots are rebuilt when selections change.
9. Cancel a scheduled fixture and confirm further editing and deletion are rejected.
10. Soft-delete another scheduled fixture and confirm it disappears from active lists.
11. Sign in as a different team admin and confirm the fixture cannot be read or changed.
12. Sign in as super admin, open **Matches**, use team/status/type/date filters, and inspect details without edit controls.

## Manual Phase 4 Test Checklist

1. Start MongoDB, backend, and frontend, then open two browser windows.
2. Sign in as the owning team admin in one window and open a scheduled match's **Live control**.
3. Open `/live/:matchId` anonymously in the second window and verify the connection indicator becomes connected.
4. Start the match and verify both windows show first half and a running timer.
5. Add team and opponent goals; verify home/away mapping and instant public updates.
6. Add an assisted goal, yellow/red cards, scored/missed/saved penalties, and both own-goal directions.
7. Substitute a valid bench player and verify on-field/bench panels; confirm re-entry and invalid substitutions are rejected.
8. Undo the latest event with a reason and verify the event remains visible internally, score is corrected, and public state refreshes.
9. End the first half, start the second half, and complete the match; verify invalid transitions and further event creation are rejected.
10. Sign in as another team admin and verify the match cannot be controlled.
11. Sign in as super admin and open **Live oversight**; confirm there are no mutation controls.
12. Disconnect/reconnect a viewer and verify REST synchronization restores current state.

## Phase 5 API List

All team routes require an active `teamAdmin`; all admin routes require `superAdmin`. Public routes are anonymous and read-only.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET`, `PATCH` | `/api/team/matches/:matchId/result` | Team admin | Read or confirm derived result metadata |
| `GET`, `POST` | `/api/team/matches/:matchId/photos` | Team admin | List or upload up to 10 photos per request |
| `PATCH`, `DELETE` | `/api/team/matches/:matchId/photos/:photoId` | Team admin | Edit metadata or storage-first delete |
| `GET` | `/api/team/statistics` | Team admin | Owned-team totals |
| `GET` | `/api/team/players/:playerId/statistics` | Team admin | Owned-player career totals |
| `GET` | `/api/team/leaderboards?type=&limit=` | Team admin | Goals, assists, appearances, or MOTM |
| `GET` | `/api/team/history` | Team admin | Filterable completed-match history |
| `GET` | `/api/admin/teams/:teamId/statistics` | Super admin | Read-only team totals |
| `GET` | `/api/admin/teams/:teamId/leaderboards` | Super admin | Read-only leaderboards |
| `GET` | `/api/admin/teams/:teamId/history` | Super admin | Read-only team history |
| `GET` | `/api/admin/players/:playerId/statistics` | Super admin | Read-only player totals |
| `GET` | `/api/admin/matches/:matchId/result` | Super admin | Read-only final result |
| `GET` | `/api/admin/matches/:matchId/photos` | Super admin | Read-only match gallery |
| `GET` | `/api/public/teams/:teamId/statistics` | Public | Sanitized team totals |
| `GET` | `/api/public/teams/:teamId/leaderboards` | Public | Sanitized leaderboards |
| `GET` | `/api/public/teams/:teamId/history` | Public | Sanitized history |
| `GET` | `/api/public/players/:playerId/statistics` | Public | Sanitized career totals |
| `GET` | `/api/public/matches/:matchId/result` | Public | Sanitized final result |
| `GET` | `/api/public/matches/:matchId/photos` | Public | Sanitized gallery |

History accepts `from`, `to`, `opponent`, `tournament`, and `outcome`. Leaderboards accept `type=goals|assists|appearances|motm` and `limit` from 1 to 50.

## Phase 5 Calculation and Storage Rules

- Only active, completed matches contribute. Undone events never contribute.
- A starter receives one start and one appearance. A substitute receives an appearance only when an active substitution event records that player entering; unused substitutes do not appear.
- Player names, position, number, and photo identity come from saved historical snapshots, so later player-card edits do not rewrite past matches.
- Team goals and outcomes are recalculated from goal, scored-penalty, and own-goal events. Win percentage is `(wins / matches played) * 100`, rounded to two decimal places.
- Leaderboard ties are resolved by value descending, player name ascending, then player ID ascending.
- Uploads accept JPEG, PNG, or WebP, require valid file signatures, have a 5 MB per-file limit, a 10-file request limit, and a 20-active-photo match limit.
- If upload or MongoDB persistence fails, already-uploaded Cloudinary assets and partial metadata are cleaned up. Deletion removes the Cloudinary asset first; MongoDB is soft-deleted only after storage confirms success. Operators should investigate Cloudinary or database outages before retrying a failed deletion.

## Manual Phase 5 Test Checklist

1. Complete a match containing team/opponent goals and an undone event, then open **Result** and verify the final score ignores the undone event.
2. Submit attendance, notes, and a Man of the Match from the saved squad; verify score, outcome, and winner cannot be overridden through the API.
3. Try selecting a player outside the match squad and confirm rejection.
4. Upload JPEG, PNG, and WebP photos; verify previews, progress, gallery categories, captions, and metadata editing.
5. Confirm files larger than 5 MB, spoofed image content, more than 10 files, and more than 20 active match photos are rejected.
6. Delete a photo and confirm it disappears from Cloudinary and the active gallery.
7. Open **Statistics** and verify starters, used/unused substitutes, goals, assists, cards, penalties, own goals, and MOTM totals against the event timeline.
8. Verify team W-D-L, goals for/against, goal difference, win percentage, and each deterministic leaderboard.
9. Filter **History** by date, opponent, tournament, and outcome, then open a result.
10. Deactivate or edit a player and confirm historical identity/statistics remain available.
11. Sign in as super admin and verify statistics, history, player statistics, results, and photos are read-only.
12. Open `/teams/:teamId/stats`, `/teams/:teamId/history`, `/players/:playerId/stats`, and `/matches/:matchId/result` anonymously and verify no internal user or Cloudinary public-ID fields are exposed.

## Phase 6A YouTube Stream API

Supported source formats:

```text
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/live/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
```

`VIDEO_ID` must contain exactly 11 YouTube-safe letters, numbers, underscores, or hyphens. The server stores the validated source URL, normalized ID, fixed YouTube embed URL, enabled state, optional title/time, and ownership timestamps. Clients cannot submit `provider`, `videoId`, `embedUrl`, `addedBy`, or internal ownership fields.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/team/matches/:matchId/stream` | Owning team admin | Read managed configuration |
| `PUT` | `/api/team/matches/:matchId/stream` | Owning team admin | Add or replace YouTube configuration |
| `PATCH` | `/api/team/matches/:matchId/stream/status` | Owning team admin | Enable or disable playback |
| `DELETE` | `/api/team/matches/:matchId/stream` | Owning team admin | Clear all stream fields |
| `GET` | `/api/public/matches/:matchId/stream` | Public | Sanitized playback state |
| `GET` | `/api/admin/matches/:matchId/stream` | Super admin | Read-only oversight |

Disabling playback preserves the managed configuration but the public endpoint returns empty `videoId` and `embedUrl` values with `isPlayable: false`. Cancelled and soft-deleted matches are also not playable. Public responses never include the original source URL, `addedBy`, account data, or private user IDs.

## Manual Phase 6A Test Checklist

1. Sign in as a team administrator and open one of the team's match-detail pages.
2. Add each supported YouTube URL format and verify the preview always uses the normalized `youtube.com/embed/VIDEO_ID` URL.
3. Edit the optional title and scheduled live time, then refresh and verify persistence.
4. Disable playback and confirm `/api/public/matches/:matchId/stream` returns `isPlayable: false` without video or embed values.
5. Enable playback and confirm the sanitized public response becomes playable.
6. Try iframe markup, an HTTP URL, a non-YouTube host, a lookalike host, and an invalid video ID; verify clear rejection.
7. Try submitting `videoId`, `embedUrl`, `addedBy`, or `teamId` directly through the API and verify rejection.
8. Sign in as another team's administrator and verify the match returns not found.
9. Cancel a match and verify playback is not public and reconfiguration is blocked; removal remains safe for existing configuration.
10. Remove the stream and verify all stream fields are cleared.
11. Sign in as super admin and verify the stream endpoint is read-only.
12. Re-test live controls, Socket.IO, results, statistics, and photos to confirm Phase 1–5 behavior is unchanged.

## Phase 6B Public Route Map

| Route | Purpose |
| --- | --- |
| `/` | Public home with live, upcoming, and latest-result sections |
| `/live` | Live and half-time match discovery |
| `/fixtures` | Scheduled-match directory and filters |
| `/results` | Completed-match directory and filters |
| `/matches/:matchId` | Status-aware match overview and saved lineups |
| `/matches/:matchId/live` | YouTube playback plus the real-time scoreboard, timer, lineups, and event timeline |
| `/matches/:matchId/result` | Existing Phase 5 full result experience |
| `/live/:matchId` | Backward-compatible live-match URL |

Authenticated administrators see a Dashboard action in the public header; anonymous viewers see Team login. The public pages never render the authenticated dashboard sidebar.

## Phase 6B Public APIs

All routes below are anonymous, read-only `GET` routes.

| Route | Response behavior |
| --- | --- |
| `/api/public/home` | Up to six live/half-time matches, six nearest future fixtures, and six newest results |
| `/api/public/live?page=&limit=` | Active live and half-time matches, ordered deterministically |
| `/api/public/fixtures` | Active scheduled matches, soonest first |
| `/api/public/results` | Active completed matches, newest first |
| `/api/public/matches/:matchId` | Sanitized status-aware match details and lineup snapshots |

Fixtures accept `from`, `to`, `matchType`, `tournament`, `teamId`, `search`, `page`, and `limit`. Results accept `from`, `to`, `tournament`, `outcome`, `teamId`, `search`, `page`, and `limit`. `outcome` is `win`, `draw`, or `loss`; `matchType` is `friendly`, `league`, `knockout`, or `practice`. Dates must be ISO 8601 values, and `to` cannot precede `from`.

Pagination defaults to page 1 with 12 matches and is capped at 50 matches per request. Responses include `page`, `limit`, `total`, and `pages`. Search input is trimmed, length-limited, and regex-escaped; team filters are intersected with the published-team set so a supplied ID cannot reveal an unpublished or archived team.

Public serializers expose only display-safe team identity, opponent details, match metadata, lineup snapshots, scores/result state, timer state, Man of the Match, and sanitized playback information. They never expose account documents or emails, JWT data, `createdBy`, `updatedBy`, `addedBy`, `uploadedBy`, `resultConfirmedBy`, Cloudinary public IDs, or the private YouTube source URL. Disabled or unavailable streams do not expose a video ID or embed URL.

## Manual Phase 6B Test Checklist

1. Publish one team and prepare scheduled, live, half-time, completed, cancelled, and soft-deleted matches; also prepare an unpublished or archived team with matches.
2. Open `/` anonymously and verify only the published team's active live/upcoming/result data appears, with no hard-coded demo records.
3. Open `/live` and verify scheduled, completed, cancelled, soft-deleted, unpublished-team, and archived-team matches are absent.
4. Open `/fixtures`; test both date boundaries, match type, tournament, team/opponent/venue search, an empty result, and multiple pages. Confirm soonest-first ordering.
5. Open `/results`; test dates, tournament, win/draw/loss, search, empty results, and pagination. Confirm newest-first ordering and Man of the Match display.
6. Open `/matches/:matchId` for every status and verify fixture details, lineups, live/result navigation, final score/outcome, and the cancelled state.
7. Enable a valid YouTube stream and open `/matches/:matchId/live`; verify the responsive 16:9 iframe, scoreboard, timer, period, events, lineups, connection indicator, and share action.
8. Disable or remove the stream and verify the stream-unavailable state while the live scoreboard remains usable.
9. Keep a live page open while controlling the match in another browser; verify Socket.IO updates, then disconnect/reconnect and confirm REST re-synchronization.
10. Verify `/live/:matchId` and `/matches/:matchId/result` bookmarks still work and that home/directory/general-match links reach the result page.
11. Sign in as each administrator role and verify the public header links to the correct dashboard without exposing dashboard navigation on public pages.
12. Inspect public API responses and confirm the private fields listed above are absent; try invalid dates, IDs, enum values, oversized limits, and regex metacharacters and confirm safe validation.

## Phase 6C Public Pages

| Route | Purpose |
| --- | --- |
| `/teams` | Published-team directory with team-name and city filters |
| `/teams/:teamSlug` | Public team identity and overview |
| `/teams/:teamSlug/squad` | Active public squad |
| `/teams/:teamSlug/fixtures` | Upcoming team fixtures |
| `/teams/:teamSlug/results` | Completed team results |
| `/teams/:teamSlug/gallery` | Categorized team match-photo gallery |
| `/players/:playerId` | Public active-player profile, statistics, awards, and recent matches |

The public team header provides consistent Overview, Squad, Fixtures, Results, and Gallery navigation. Team slugs are stable public identifiers. Existing match, live, result, statistics, and history URLs remain backward compatible.

## Phase 6C Public APIs

| Route | Query parameters | Purpose |
| --- | --- | --- |
| `GET /api/public/teams` | `search`, `city`, `page`, `limit` | Published teams with derived summary statistics |
| `GET /api/public/teams/:teamSlug` | None | Team identity, statistics, leaders, next/latest matches, and gallery preview |
| `GET /api/public/teams/:teamSlug/squad` | None | Active squad with public player-card fields |
| `GET /api/public/teams/:teamSlug/fixtures` | `page`, `limit` | Future scheduled fixtures, soonest first |
| `GET /api/public/teams/:teamSlug/results` | `page`, `limit` | Completed results, newest first |
| `GET /api/public/teams/:teamSlug/gallery` | `category`, `page`, `limit` | Photos attached to active completed matches |
| `GET /api/public/players/:playerId/profile` | None | Active player identity, statistics, awards, and recent match squads |

Directory and profile routes resolve only `isPublished: true`, non-archived teams. Squad and player routes additionally require active players. Public player responses never include availability, activation state, ownership metadata, or account data. Gallery responses include only image URL, public caption/category, and creation time; they omit Cloudinary public IDs, upload ownership, internal filenames, byte counts, and storage metadata.

Team directory pagination defaults to 12 and team gallery pagination defaults to 18; both are capped at 30. Team-name and city filters are trimmed, length-limited, and regex-escaped. Team-specific match lists reuse the Phase 6B safe match cards and pagination.

Super administrators can open `/admin/teams/:teamId/profile` from the team registry to manage short name, city, coach, home ground, founded year, logo, cover photo, description, public social links, and publication status. Instagram links must point to `instagram.com` or `www.instagram.com`; invalid or non-Instagram URLs are rejected. The supporting protected API is `PATCH /api/admin/teams/:teamId`.

## Manual Phase 6C Test Checklist

1. Sign in as super admin, open a team’s public-profile editor, fill every optional field, publish it, and confirm the public link values persist after refresh.
2. Keep a second team private and archive another; verify neither appears at `/teams` and neither slug resolves through the public APIs.
3. Test team-name and city filters with ordinary text and regex metacharacters, then verify pagination and alphabetical ordering.
4. Open the published team overview and verify its cover/logo fallbacks, identity fields, public links, derived statistics, active-player leaders, next fixture, latest result, and six-photo preview.
5. Open the squad and confirm only active players appear. Verify availability and internal activation values are absent from the network response.
6. Open each squad player profile and verify age, academic year, preferred foot, leadership, career statistics, awards, and recent completed match squads.
7. Deactivate a player and confirm the squad/profile hide that player and public leader links do not expose the inactive profile.
8. Open team fixtures and verify only future scheduled active matches appear, soonest first. Open team results and verify completed active matches appear newest first.
9. Upload categorized photos to completed matches, then verify the team gallery categories, responsive layout, pagination, and gallery preview.
10. Inspect every Phase 6C response and verify no `createdBy`, `updatedBy`, availability, emails, account documents, Cloudinary public IDs, upload ownership, or private stream fields are present.
11. Re-test login, both dashboards, squad management, match creation, live control and Socket.IO, results, photos, statistics, YouTube playback, and all Phase 6B public pages.

## Phase 6D Global Search

Open `/search?q=kiet&type=all`. The public header also provides a compact desktop search with up to five combined suggestions and a mobile Search action. Suggestions begin after two characters, wait approximately 350 milliseconds, support Up/Down/Enter/Escape keys, close outside the control, and navigate to the canonical team, player, match, live, or result page.

`GET /api/public/search` accepts:

| Parameter | Rules |
| --- | --- |
| `q` | Required trimmed string, 2–100 characters |
| `type` | `all` (default), `teams`, `players`, or `matches` |
| `page` | Positive integer; used by a specific result type |
| `limit` | 1–30, default 10 per group/type |

`type=all` returns `teams`, `players`, and `matches` groups with bounded items and totals. A specific type returns `items` plus `page`, `limit`, `total`, and `pages` metadata. Search input is regex-escaped and object/array queries, unsupported types, invalid pages, and excessive limits are rejected.

Teams match name, short name, city, or home ground. Players match name, position, numeric jersey number, or public team name. Matches match team name, opponent, tournament, or venue. Search excludes unpublished/archived teams, inactive players, inactive matches, cancelled matches, and matches outside the public-team set. Responses use the existing public-safe serializers and never include account ownership, availability, private stream URLs, or protected storage fields.

## Phase 6D Metadata and Sharing

Public pages update the document title, description, canonical URL, Open Graph title/description/URL/image, and practical Twitter card fields. Dynamic team, player, and match metadata uses only data already approved for public serialization. External Cloudinary/team/player images remain absolute HTTPS URLs; when no public image exists, image metadata is omitted.

FootStream remains a client-rendered React SPA. Metadata becomes accurate after JavaScript loads, so crawlers that do not execute JavaScript may see only the static `index.html` values. Phase 6D does not add SSR, prerendering, sitemap generation, or deployment-specific SEO infrastructure.

The reusable Share action appears on public team, player, match, live, and result pages. It uses the Web Share API first, copies the canonical link when native sharing is unavailable, and presents a manual-copy prompt if clipboard access is denied. Accessible live feedback reports successful copy/share actions without exposing private fields.

## Phase 6D Accessibility and Performance

- A skip link targets the focusable public main landmark.
- Public route changes scroll to the top and move focus to the main content without affecting authenticated dashboard routing.
- The mobile menu focuses its first item, closes with Escape, and returns focus to its trigger.
- Header suggestions expose expanded/active state, keyboard navigation, and outside-click dismissal.
- Public forms have labels; errors, loading placeholders, search counts, empty states, and sharing feedback use appropriate live/status semantics.
- Breadcrumb navigation is provided for team, player, match, live, and result contexts.
- Visible focus styles and reduced-motion behavior are applied without a new UI or accessibility framework.
- Larger public routes use `React.lazy` and `Suspense`; directories continue to avoid event timelines and every backend search remains bounded.
- Reusable player/team images and gallery images use lazy loading and asynchronous decoding where appropriate. The YouTube iframe remains lazy loaded.

## Manual Phase 6D Test Checklist

1. Search with missing, blank, one-character, object-style, and regex-special input; verify validation and that private resources never appear.
2. Search published teams by name, short name, city, and home ground. Confirm exact names precede prefixes and alphabetical ties are deterministic.
3. Search active players by name, position, public team name, and numeric jersey number. Confirm inactive/private-team players and availability fields are absent.
4. Search matches by team, opponent, tournament, and venue. Confirm live entries precede upcoming fixtures and completed results, with inactive/private/cancelled matches absent.
5. Exercise All/Teams/Players/Matches controls, URL back/forward behavior, debounce, counts, empty/error/loading states, and specific-type pagination.
6. Use the desktop header suggestions with mouse, Up/Down/Enter/Escape, and outside click. Verify the mobile menu Search action at smaller widths.
7. Navigate through every public route and inspect title, description, canonical, Open Graph, and Twitter fields. Confirm `VITE_PUBLIC_APP_URL` controls canonical/share origins and no private data appears.
8. Test Share on a team, player, scheduled match, live match, and result with native sharing, clipboard fallback, denied clipboard access, and user-cancelled sharing.
9. Navigate using only the keyboard: use the skip link, menu, search, type controls, pagination, breadcrumbs, cards, and 404 actions. Verify visible focus and sensible route-change focus.
10. Enable reduced motion, test image fallbacks and loading announcements, and confirm the YouTube iframe retains an accessible title and fullscreen support.
11. Directly load each lazy public route and verify its loading state and final page. Confirm authenticated dashboards and live-control workflows are unchanged.
12. Re-run authentication, squad/match management, Socket.IO, results, statistics, photos, YouTube streams, and all earlier public APIs as regression coverage.

## Phase 6D.5 Live Notifications and Branding Uploads

Public live match pages now show animated, queued event overlays for newly received Socket.IO updates only. Initial REST loads and reconnect resyncs refresh the scoreboard/timeline without replaying old overlays. Goal, assisted-goal, penalty-scored, and own-goal notifications remain visible for about 4.5 seconds; cards, substitutions, missed/saved penalties, match transitions, and event corrections remain visible for about 3 seconds. The overlay uses `aria-live`, supports manual dismissal, and respects reduced-motion preferences.

Team logo and cover photo management now uses direct Cloudinary uploads instead of raw URL entry. Super admins can upload/remove branding from `/admin/teams/:teamId/profile`; team admins can upload/remove branding from their My Team dashboard. Public responses expose only safe image URLs and dimensions where useful; Cloudinary `publicId` values remain private.

Branding upload APIs:

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `PUT` | `/api/team/profile/logo` | Team admin | Upload or replace the assigned team's logo |
| `DELETE` | `/api/team/profile/logo` | Team admin | Remove the assigned team's logo |
| `PUT` | `/api/team/profile/cover` | Team admin | Upload or replace the assigned team's cover photo |
| `DELETE` | `/api/team/profile/cover` | Team admin | Remove the assigned team's cover photo |
| `PUT` | `/api/admin/teams/:teamId/logo` | Super admin | Upload or replace a team's logo |
| `DELETE` | `/api/admin/teams/:teamId/logo` | Super admin | Remove a team's logo |
| `PUT` | `/api/admin/teams/:teamId/cover` | Super admin | Upload or replace a team's cover photo |
| `DELETE` | `/api/admin/teams/:teamId/cover` | Super admin | Remove a team's cover photo |

Uploads use multipart form data with the field name `image`. Logos accept JPEG, PNG, or WebP files up to 2 MB and are stored under `footstream/teams/<teamId>/logo`. Covers accept JPEG, PNG, or WebP files up to 5 MB and are stored under `footstream/teams/<teamId>/cover`. The server validates MIME type and file signatures, never trusts original filenames, never stores image bytes in MongoDB, uploads the replacement before saving new metadata, cleans newly uploaded assets if database persistence fails, and deletes old Cloudinary assets after successful replacement.

## Manual Phase 6D.5 Test Checklist

1. Open a public live match in one browser and team live control in another. Create a goal with assist, card, substitution, penalty outcome, own goal, transition, and undo; verify one overlay appears at a time and the scoreboard/timeline still update.
2. Reconnect the public live page and confirm existing REST events are not replayed as new overlays.
3. Enable reduced motion and confirm overlays do not use entrance/exit motion.
4. Sign in as super admin, open a team's public profile editor, upload logo and cover images, refresh, replace both, then remove both.
5. Sign in as team admin, open My Team, upload logo and cover images, refresh, replace both, then remove both. Confirm another team's branding endpoints are not available through team-admin routes.
6. Try oversized, unsupported, and MIME-spoofed files. Confirm clear validation errors and no public `publicId` values appear in public team, match, search, or live responses.

## Player Photo Direct Upload

Player cards now use direct Cloudinary uploads instead of raw Photo URL entry. The player create/edit modal contains only player identity, squad, academic, and leadership fields; team admins manage photos from each squad card.

Player photo APIs:

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `PUT` | `/api/team/players/:playerId/photo` | Assigned team admin only | Upload or replace a player photo |
| `DELETE` | `/api/team/players/:playerId/photo` | Assigned team admin only | Remove the uploaded player photo |

Uploads use multipart form data with field name `image`. JPEG, PNG, and WebP files up to 3 MB are accepted and stored under `footstream/teams/<teamId>/players/<playerId>`. The backend validates MIME type and file signature, stores only Cloudinary metadata, deletes the previous Cloudinary asset after a successful replacement, and removes newly uploaded assets if database persistence fails. Legacy `photoUrl` strings remain readable until a player receives an uploaded photo; public and authenticated responses expose only the safe `photoUrl` display value and never expose Cloudinary `publicId`.

## Phase 6E Production Readiness

Production readiness adds fail-fast environment validation, request IDs, production-safe error responses, Helmet security headers, compression, stricter CORS, rate limiting, cache headers, top-level health/readiness endpoints, and graceful shutdown.

Health endpoints:

| Route | Purpose |
| --- | --- |
| `GET /health` | Platform-friendly health response with `status`, `uptime`, `database`, `cloudinary`, `version`, and `environment` |
| `GET /ready` | Readiness response for deployment probes |
| `GET /api/health` | Backward-compatible API health route |
| `GET /api/health/ready` | Backward-compatible API readiness route |

Required production environment:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Enables production validation and production-safe behavior |
| `PORT` | Backend listen port |
| `MONGODB_URI` | MongoDB Atlas or managed MongoDB connection string |
| `JWT_SECRET` | At least 32 characters |
| `JWT_EXPIRES_IN` | Session token lifetime |
| `COOKIE_NAME` | Auth cookie name |
| `COOKIE_MAX_AGE_MS` | Auth cookie lifetime |
| `CLIENT_URL` | Primary frontend origin |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | Match-photo folder prefix |
| `SUPER_ADMIN_NAME` | Seed script display name |
| `SUPER_ADMIN_EMAIL` | Seed script email |
| `SUPER_ADMIN_PASSWORD` | Seed script initial password |
| `VITE_API_URL` | Frontend API base URL |
| `VITE_PUBLIC_APP_URL` | Frontend public canonical/share origin |

Deployment checklist:

1. Create MongoDB Atlas and Cloudinary accounts.
2. Configure backend environment variables on Render, Railway, or DigitalOcean App Platform.
3. Configure frontend environment variables on Vercel or Netlify.
4. Set `CLIENT_URL` and `CORS_ORIGINS` to the deployed frontend origin.
5. Seed exactly one super-admin account with `npm run seed:admin`.
6. Verify `/health` and `/ready` after deployment.
7. Confirm cookies are marked secure in production and browser requests include credentials.
8. Exercise login, squad photos, team branding, match photos, public search, live pages, and public profiles.
9. Keep deployment secrets only in provider dashboards; do not commit `.env` files.
10. Do not enable Phase 7 features until Phase 6E has been accepted.

Manual production-readiness checks:

1. Start backend without a required production variable and confirm startup fails fast.
2. Start backend with valid variables and confirm `/health`, `/ready`, `/api/health`, and `/api/health/ready` respond.
3. Send disallowed-origin requests and confirm CORS blocks them.
4. Trigger a 404 and validation error and confirm the central error format includes `requestId` without leaking stack traces in production.
5. Confirm public GET responses include cache headers and image responses receive long-lived immutable caching when served by the API.
6. Confirm auth, upload, and public search routes are rate-limited.
7. Stop the process and confirm graceful shutdown disconnects MongoDB.

## Phase 6F Public Team Join Requests

Phase 6F lets anonymous visitors apply to join a published team while keeping the final squad record under team-admin control. A published team profile shows a Join Team action only when `acceptingJoinRequests` is enabled for that team. Team admins can toggle this from My Team; super admins can also set the same public-profile field from the team profile editor.

Public join routes:

| Route | Purpose |
| --- | --- |
| `/teams/:teamSlug/join` | Public team application form |
| `/join-requests/:requestCode/status` | Public status page for a submitted request |
| `/join-requests/status` | Manual request-code lookup page |

Join request APIs:

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/public/teams/:teamSlug/join-requests` | Public | Submit a request for a published team that is accepting requests |
| `GET` | `/api/public/join-requests/:requestCode/status` | Public | Return public-safe request status |
| `PATCH` | `/api/team/profile/join-requests-status` | teamAdmin | Toggle whether the assigned team accepts public requests |
| `GET` | `/api/team/join-requests` | teamAdmin | List requests for the assigned team |
| `GET` | `/api/team/join-requests/:requestId` | teamAdmin | Review a single owned request |
| `PATCH` | `/api/team/join-requests/:requestId/approve` | teamAdmin | Convert a pending request into an official player |
| `PATCH` | `/api/team/join-requests/:requestId/reject` | teamAdmin | Reject a pending request and clean applicant photo storage |
| `GET` | `/api/admin/teams/:teamId/join-requests` | superAdmin | Read-only requests for one team |
| `GET` | `/api/admin/join-requests/:requestId` | superAdmin | Read-only request detail |

The public submission endpoint uses multipart form data with optional field name `image`. JPEG, PNG, and WebP files up to 3 MB are accepted. Applicant photos are stored under `footstream/join-requests/<teamId>/<requestCode>` and are temporary until approval or rejection.

Request status flow:

1. A public visitor opens `/teams/:teamSlug/join`.
2. The visitor submits applicant details and an optional photo. The form does not contain a jersey-number input.
3. The backend validates that the team is published, non-archived, and accepting requests.
4. The backend rejects protected public fields, including `jerseyNumber`, reviewer fields, request status fields, team IDs, player IDs, Cloudinary IDs, and ownership metadata.
5. The backend blocks another pending request for the same team from the same email or phone.
6. The applicant receives a private request code and can check `/join-requests/:requestCode/status`.
7. A team admin reviews the request from `/team/join-requests/:requestId`.
8. Approval requires the team admin to assign the official jersey number and creates exactly one official player record for the assigned team.
9. Rejection records an optional safe reason and deletes the applicant's temporary Cloudinary photo asset.

Privacy and ownership rules:

- Applicant email and phone are visible only to authenticated team admins for their own team and super-admin oversight.
- Public submission and status responses never expose applicant contact data, reviewer account data, approval internals, Cloudinary `publicId`, upload metadata, JWT data, or administrative ownership fields.
- Team admins never submit or choose a team ID for join-request management; the API derives the team from the authenticated account.
- Cross-team request IDs return not found for team admins.
- Public search excludes join requests entirely.
- Disabled users remain blocked by the existing authentication middleware before any team-admin join-request action runs.

Approval consistency strategy:

- Requests can only move from `pending` to `approved` or `rejected`.
- Approval is rejected when a request has already been reviewed or already has a linked `createdPlayer`.
- Player creation runs through the existing squad validation rules, so duplicate active jersey numbers, captain conflicts, vice-captain conflicts, cross-team ownership, and invalid player fields are rejected before the request is finalized.
- If player creation fails validation, the request remains pending and can be corrected.
- The created player stores the approved official jersey number, not applicant-supplied data.

Photo cleanup behavior:

- If applicant photo upload succeeds but request persistence fails, the newly uploaded Cloudinary asset is deleted.
- Rejection deletes the applicant's Cloudinary asset before the request is marked rejected.
- Approval transfers the safe applicant photo metadata to the official player record; public serializers expose only the safe image URL.

Manual Phase 6F test checklist:

1. Publish a team, enable join requests, open `/teams/:teamSlug`, and verify the Join Team action appears.
2. Disable join requests and confirm the public Join Team action disappears and `/teams/:teamSlug/join` shows the closed state.
3. Submit a valid public application with no photo and confirm the success screen displays a request code.
4. Submit a valid public application with JPEG, PNG, and WebP photos; confirm previews work and oversized/invalid signatures are rejected.
5. Inspect the public form and network payload and confirm there is no applicant jersey number field.
6. Try adding `jerseyNumber`, team IDs, reviewer fields, status fields, or Cloudinary fields to the public request body and confirm validation rejects them.
7. Submit another pending request for the same team using the same email or phone and confirm it is blocked.
8. Open `/join-requests/:requestCode/status` and confirm it shows status without email, phone, reviewer, approval data, or Cloudinary IDs.
9. Sign in as the assigned team admin, open `/team/join-requests`, view the request detail, approve it with an official jersey number, and confirm a player is created.
10. Attempt to approve the same request again and confirm it is rejected.
11. Attempt to approve with a duplicate active jersey number and confirm the request remains pending.
12. Submit another request with a photo, reject it, and confirm the request is rejected and the temporary Cloudinary photo asset is removed.
13. Sign in as a different team admin and confirm cross-team join-request IDs are not accessible.
14. Sign in as super admin and confirm the read-only oversight endpoints/pages expose no mutation controls.
15. Search publicly for applicant names, emails, and phones and confirm join requests are not returned.
16. Re-test login, dashboards, squad management, player photos, match scheduling, live control, results, public portal, public profiles, search, team branding, and production health endpoints.

Deployment automation, hosting configuration, community accounts, chat, reactions, polls, account notifications, payments, tournament management, and custom video hosting are not included.
