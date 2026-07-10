# FootStream

FootStream is a football team and match-management platform. This repository currently implements **Phases 1 through 3**: the MERN foundation, administrative authentication, team administration, permanent squads, match scheduling, and match-day lineup selection.

Live scoring, match events, streaming, Socket.IO, results, statistics, media uploads, and payment features are intentionally not included.

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

## Technology

### Backend

Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, express-validator, cookie-parser, Helmet, CORS, Morgan, dotenv, and express-rate-limit.

### Frontend

React, Vite, Tailwind CSS, React Router, Axios, Context API, and Lucide React.

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
|   |   |   |-- Player.js
|   |   |   |-- Team.js
|   |   |   `-- User.js
|   |   |-- services/
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

The default frontend API URL is `http://localhost:5000/api`. The backend permits `http://localhost:5173` by default.

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

Deployment itself belongs to Phase 6 and is not included in this implementation.

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
