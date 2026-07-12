# FootStream

FootStream is a football team and match-management platform. This repository currently implements **Phases 1 through 5 plus Phases 6A and 6B**: the MERN foundation, administration, permanent squads, match scheduling, live match control, results, photos, statistics, secure YouTube stream configuration, and the core anonymous public match portal.

Detailed public team/player profiles, global search, advanced SEO, deployment configuration, social interactions, notifications, and Phase 7 features are intentionally not included.

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
| `GET` | `/api/admin/matches` | superAdmin | List all active matches with filters |
| `GET` | `/api/admin/matches/:matchId` | superAdmin | View one match and lineup snapshots |
| `GET` | `/api/admin/team-admins` | superAdmin | List team administrators |
| `POST` | `/api/admin/team-admins` | superAdmin | Create and assign a team administrator |
| `PATCH` | `/api/admin/team-admins/:userId/status` | superAdmin | Enable or disable a team administrator |
| `GET` | `/api/team/current` | teamAdmin | Return the authenticated admin's assigned team |
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

The default frontend API URL is `http://localhost:5000/api`. The backend permits `http://localhost:5173` by default.

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

Deployment configuration is reserved for a later Phase 6 milestone and is not included in Phase 6B.

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

## Remaining Phase 6 Roadmap

The following work is not implemented in this branch:

- **Phase 6C:** detailed public team and player profiles/directories.
- **Phase 6D:** broader public discovery such as global search and deliberate SEO/accessibility refinement.
- **Phase 6E:** deployment configuration, production hosting, monitoring, and launch hardening.

Chat, reactions, polls, notifications, custom video hosting, payments, and all Phase 7 functionality remain outside Phase 6B.
