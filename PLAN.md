# FootStream MVP Plan

## 1. Planning Status

This document defines the approved direction for a practical, free-to-build MERN MVP of FootStream.

FootStream will use JavaScript, npm, a `frontend/` and `backend/` structure, a local MongoDB database during development, and only free and open-source development libraries. It will begin as one React application and one Express application. Infrastructure will be added only when real usage requires it.

No application code will be written until this revised plan is approved.

## 2. Project Vision

FootStream is a football team, squad, and match-management website. A super admin creates teams and team-admin accounts. Each team admin manages a permanent player pool, creates matches, selects a starting XI and substitutes, controls live match events, and publishes team and match information for public viewers.

Public viewers do not need accounts. They can browse public teams, players, matches, live scoreboards, match timelines, results, photos, statistics, and an embedded YouTube Live broadcast.

The MVP should be:

- simple enough for one small team to build and maintain;
- free to develop locally;
- secure enough for its two administrative roles;
- usable on phones and desktop browsers;
- organized so features can grow without introducing unnecessary services;
- based on one backend, one frontend, and one MongoDB database.

## 3. MVP Scope

### Administration

- Secure login for `superAdmin` and `teamAdmin` users.
- No public registration page.
- The initial `superAdmin` is created with a local seed script or one-time setup command.
- The super admin creates, views, updates, disables, and resets credentials for team-admin accounts.
- The super admin creates and manages teams and assigns team admins to teams.
- A team admin can manage only the team assigned to that account.

### Teams and permanent player pool

- A team has a name, logo, description, optional location, and public slug.
- Every team owns a permanent player pool.
- A player card contains:
  - photo;
  - name;
  - position;
  - age;
  - academic year;
  - jersey number;
  - availability status.
- Team admins can add, edit, archive, and restore their players.
- Archived players remain available in historical match records.
- Player jersey numbers must be unique among active players in the same team.

### Match preparation

- A team admin creates a match for their team.
- The opponent is entered by name only; it does not require an opponent team account or full team record.
- Optional temporary opponent player names can be added to the match.
- The team admin selects the starting XI and substitutes from the team's permanent, available player pool.
- The match stores lineup snapshots so later player edits do not rewrite historical match information.
- A YouTube video or live URL can be attached to the match.

### Live match management

- Match states: `scheduled`, `live`, `completed`, and `cancelled`.
- The team admin starts and completes a match.
- The live control screen displays the score, match status, selected squads, and event timeline.
- Supported events:
  - goal;
  - assist;
  - yellow card;
  - red card;
  - substitution;
  - penalty scored;
  - penalty missed;
  - penalty saved;
  - own goal.
- Events may refer to a permanent FootStream player or an optional temporary opponent player/name.
- Goal-related events update the correct score automatically.
- Substitutions record the player leaving and the player entering.
- `Undo last event` reverses only the latest active event and recalculates the match state and score from the remaining event timeline.
- Socket.IO will be introduced in Phase 4 to send score, status, and timeline changes to public match pages without refreshing.

### Completed matches and public content

- Store and display the final result.
- Select Man of the Match from the FootStream team's match squad.
- Upload or attach match photos.
- Calculate player career statistics from completed match events and appearances.
- Display team match history and aggregate team statistics.
- Provide public team, player, match, live scoreboard, and result pages.
- Embed the configured YouTube Live stream using YouTube's supported embed URL. FootStream does not host or retransmit video.

### Deliberately excluded

- Viewer accounts and viewer registration.
- Billing, subscriptions, payments, or paid access.
- MFA in the MVP.
- Redis, BullMQ, Kafka, message queues, workers, or microservices.
- Custom video hosting, encoding, or delivery.
- Docker as a local-development requirement.
- A full opponent-team database.
- Native mobile applications.
- Chat, comments, notifications, or social features.

## 4. User Roles and Permissions

Only two authenticated roles exist initially.

### `superAdmin`

The super admin can:

- log in and manage their own password;
- create, edit, activate, or deactivate team-admin accounts;
- create, edit, publish, archive, and restore teams;
- assign or reassign a team admin to a team;
- view and manage all teams, players, matches, photos, and statistics;
- correct data when operational support is required.

### `teamAdmin`

The team admin can:

- log in and manage their own password;
- view and edit only their assigned team;
- manage that team's permanent player pool;
- create and edit that team's matches;
- select that team's lineup and substitutes;
- control that team's live match, events, result, photos, and Man of the Match;
- view that team's statistics and history.

A team admin cannot:

- self-register;
- create or manage administrator accounts;
- create another team unless a super admin grants it by assignment;
- access or change another team's private administration data;
- change their own role or team assignment.

### Public viewer

A public viewer is not an authenticated role. Public users may read only published team, player, match, result, statistic, photo, scoreboard, timeline, and YouTube embed data. They cannot create or update anything.

Authorization must be checked in the Express backend on every protected request. Hiding a frontend button is helpful for usability but is not a security boundary.

## 5. Technology Choices

All application libraries chosen for the MVP are free and open source.

### Shared foundation

- **JavaScript:** required for the project and keeps the initial MERN stack familiar and lightweight.
- **npm:** bundled with Node.js, widely documented, and sufficient for two independently managed applications.
- **Git:** tracks changes and supports a simple review and release workflow.
- **ESLint and Prettier:** catch common JavaScript mistakes and keep formatting consistent.
- **Environment variables with `dotenv`:** keep database URLs, JWT secrets, ports, and other environment-specific values out of source code.

### Frontend

- **React:** component-based UI suitable for admin forms, match control screens, player cards, and public pages.
- **Vite:** fast local development server and a simple optimized React build.
- **Tailwind CSS:** responsive styling without purchasing a UI kit or maintaining a large custom stylesheet.
- **React Router:** public and protected page routing inside the single-page application.
- **Axios:** a small central HTTP client with consistent base URL, credentials/token handling, and error behavior.
- **Socket.IO client, added in Phase 4:** receives live scoreboard and match-event changes with reconnection support.

React state and custom hooks are sufficient initially. A global state library is not required for the MVP. Authentication context can hold the logged-in administrator, while feature pages fetch their own server data.

### Backend

- **Node.js:** JavaScript runtime for the server and a natural fit with React and MongoDB.
- **Express:** small, established HTTP framework for routes and middleware.
- **MongoDB:** flexible document database suitable for teams, players, match lineups, and event timelines.
- **Mongoose:** defines schemas, validation, references, indexes, and database queries.
- **JWT:** signed administrator authentication tokens without a separate session store.
- **bcryptjs:** hashes administrator passwords using a pure-JavaScript package that is easy to run locally.
- **Socket.IO, added in Phase 4:** broadcasts live match changes from the existing Express server. It is not a separate service.
- **Multer:** handles controlled image uploads for player photos, team logos, and match photos during the MVP.
- **Helmet, CORS, and express-rate-limit:** add basic HTTP security headers, restrict allowed frontend origins, and slow repeated login attempts.

### Testing

- **Vitest and React Testing Library:** test frontend components and behavior.
- **Node's test runner or Jest plus Supertest:** test backend rules and API endpoints. One backend test runner will be selected during setup and used consistently.
- **Manual browser testing:** verify responsive admin and public workflows at each phase.

No paid tool or hosted service is required to develop the application locally. Deployment services and limits can be selected in Phase 6 based on currently available free tiers; the application will not depend on vendor-specific code.

## 6. Simple System Architecture

```text
Public viewer or administrator browser
                  |
                  v
       React + Vite frontend
          | REST       | Socket.IO (Phase 4)
          v            v
      Node.js + Express backend
                  |
                  v
        MongoDB through Mongoose

YouTube Live ----------> embedded directly in public match page
Uploaded images -------> local uploads in development
```

The React frontend calls JSON endpoints on the Express backend. Express contains authentication, permissions, validation, business rules, Socket.IO, and Mongoose data access. MongoDB is the only database. Public YouTube playback happens through an iframe embed; the database stores only the validated YouTube video ID and related display information.

This remains scalable through clean feature modules, useful MongoDB indexes, pagination, and stateless REST requests. Scaling infrastructure should be introduced only after measurement shows a need.

## 7. Repository and Folder Structure

```text
footstream/
├── backend/
│   ├── src/
│   │   ├── config/              # environment and database configuration
│   │   ├── controllers/         # HTTP request/response handling
│   │   ├── middleware/          # authentication, roles, errors, uploads
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # Express route definitions
│   │   ├── services/            # match event, score, and statistics rules
│   │   ├── sockets/             # Socket.IO setup added in Phase 4
│   │   ├── utils/               # reusable small helpers
│   │   ├── app.js               # Express application
│   │   └── server.js            # HTTP server and database startup
│   ├── scripts/                 # initial super-admin seed script
│   ├── tests/
│   ├── uploads/                 # ignored local development uploads
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                 # central Axios clients
│   │   ├── assets/
│   │   ├── components/          # shared UI components
│   │   ├── context/             # authentication context
│   │   ├── features/            # auth, teams, players, matches, live controls
│   │   ├── hooks/
│   │   ├── layouts/             # public and admin layouts
│   │   ├── pages/               # route pages
│   │   ├── routes/              # router and protected route logic
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── .gitignore
├── README.md
└── PLAN.md
```

The structure intentionally avoids workspaces, shared packages, infrastructure folders, workers, and separate services. Backend controllers should remain small; reusable match and statistics rules belong in services so they can be tested independently.

## 8. Database Architecture

Development uses a locally installed MongoDB instance, for example a database named `footstream`. Mongoose schemas provide validation and indexes.

### `users`

Stores administrator accounts:

- `name`
- normalized unique `email`
- `passwordHash`
- `role`: `superAdmin` or `teamAdmin`
- `team`: team reference for a team admin, otherwise `null`
- `isActive`
- `createdBy`
- timestamps

The password hash is never returned by the API. A team-admin account must have an assigned team, and only a super admin can create it.

### `teams`

- `name`
- unique public `slug`
- `logo`
- `description`
- `location`
- `isPublished`
- `isArchived`
- timestamps

### `players`

- `team` reference
- `name`
- `slug` unique within the team
- `photo`
- `position`
- `dateOfBirth` or `age`
- `academicYear`
- `jerseyNumber`
- `availabilityStatus`: `available`, `injured`, `suspended`, or `unavailable`
- `isArchived`
- timestamps

Storing date of birth is preferable when known because age changes automatically; the public card can calculate current age. If only age is available, the MVP may store age directly. A compound index supports team/player queries, and an active player's jersey number is unique within their team.

### `matches`

- `team` reference
- `opponentName`
- `opponentPlayers`: optional temporary names stored only for this match
- `venue`
- `kickoffAt`
- `status`: `scheduled`, `live`, `completed`, or `cancelled`
- `startingXI`: selected player references plus name/number snapshots
- `substitutes`: selected player references plus name/number snapshots
- `homeOrAway`
- `teamScore`
- `opponentScore`
- `youtubeVideoId`
- `manOfTheMatch`: player reference and display snapshot
- `resultSummary`
- `isPublished`
- timestamps

The opponent remains plain match data rather than a permanent `teams` record. The team's lineup stores player references for statistics and snapshots for historical display.

### `matchEvents`

- `match` reference
- `sequence` number
- `type`: `goal`, `assist`, `yellowCard`, `redCard`, `substitution`, `penaltyScored`, `penaltyMissed`, `penaltySaved`, or `ownGoal`
- `side`: `team` or `opponent`
- `minute`
- `player`: optional permanent player reference
- `playerName`: display snapshot or temporary opponent name
- `relatedPlayer`: optional assister or substitution player reference
- `relatedPlayerName`
- `details`
- `isUndone`
- `createdBy`
- timestamps

`match + sequence` is unique. Events are the source for live timeline and score calculation. Undo marks the last active event as undone rather than deleting it, then recomputes the score. This keeps the implementation understandable and preserves correction history.

### `matchPhotos`

- `match` reference
- `url` or stored file path
- `caption`
- `uploadedBy`
- timestamps

The MVP stores image paths in MongoDB, not binary image data. Files live in `backend/uploads` during local development. Phase 6 deployment can use a free-compatible external image store if the chosen host does not provide persistent disk storage.

### Statistics approach

Career and team statistics should initially be calculated from completed, non-undone match events and lineup appearances. This prevents duplicate counters from becoming inconsistent. If real usage makes calculations slow, cached totals can be added later without changing the public API.

Typical player totals include appearances, starts, goals, assists, yellow cards, red cards, own goals, penalties scored, and Man of the Match awards. Team totals include matches played, wins, draws, losses, goals for, and goals against.

## 9. API Architecture

The backend exposes JSON REST routes under `/api`. Routes are grouped by feature and protected with JWT and role/team middleware where needed.

### Authentication

```text
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/change-password
```

There is no registration route. The first super admin is seeded locally, and only a logged-in super admin can create team admins.

### Super-admin management

```text
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:userId
PATCH  /api/admin/users/:userId/status
PUT    /api/admin/users/:userId/password

GET    /api/admin/teams
POST   /api/admin/teams
PUT    /api/admin/teams/:teamId
PATCH  /api/admin/teams/:teamId/archive
PUT    /api/admin/teams/:teamId/admin
```

### Team and player management

```text
GET    /api/team
PUT    /api/team

GET    /api/players
POST   /api/players
GET    /api/players/:playerId
PUT    /api/players/:playerId
PATCH  /api/players/:playerId/archive
PATCH  /api/players/:playerId/restore
```

For a team admin, the backend derives the team from the JWT/user record. It does not trust a client-provided team ID. A super admin can use an explicit team filter when managing all data.

### Match management

```text
GET    /api/matches
POST   /api/matches
GET    /api/matches/:matchId
PUT    /api/matches/:matchId
PUT    /api/matches/:matchId/lineup
PATCH  /api/matches/:matchId/status

GET    /api/matches/:matchId/events
POST   /api/matches/:matchId/events
POST   /api/matches/:matchId/events/undo-last

PUT    /api/matches/:matchId/result
PUT    /api/matches/:matchId/man-of-the-match
GET    /api/matches/:matchId/photos
POST   /api/matches/:matchId/photos
DELETE /api/matches/:matchId/photos/:photoId
```

### Statistics

```text
GET    /api/stats/teams/:teamId
GET    /api/stats/players/:playerId
```

### Public read-only routes

```text
GET    /api/public/teams
GET    /api/public/teams/:teamSlug
GET    /api/public/teams/:teamSlug/players
GET    /api/public/teams/:teamSlug/matches
GET    /api/public/players/:teamSlug/:playerSlug
GET    /api/public/matches
GET    /api/public/matches/:matchId
GET    /api/public/matches/:matchId/events
```

Public endpoints return only published content and safe fields. Match and player lists use simple page/limit pagination when their size begins to grow.

### API rules

- Validate request bodies, route parameters, image type, and image size.
- Return consistent success and error JSON.
- Use one global error handler rather than repeated route error code.
- Restrict login attempts with rate limiting.
- Add indexes for unique email, slugs, team players, match dates, and event sequence.
- Never expose password hashes, JWT secrets, internal file paths, or unpublished team data.

## 10. Authentication Flow

1. A setup script creates the initial super-admin account from environment-provided credentials and hashes the password with `bcryptjs`.
2. The super admin logs in with email and password.
3. Express verifies the account is active and compares the password with the stored bcrypt hash.
4. Express signs a JWT containing the user ID and role with a secret from `.env` and a short expiration time.
5. The browser sends the JWT with protected requests. The preferred MVP approach is a secure, HTTP-only cookie so frontend JavaScript cannot read the token; local development uses appropriate non-secure cookie settings.
6. Authentication middleware verifies the JWT and reloads the user so account deactivation and team reassignment take effect.
7. Role middleware permits super-admin-only operations. Team ownership middleware restricts team admins to their assigned team.
8. The super admin creates team-admin accounts and supplies an initial password through a secure offline process. Team admins should change that password after first login.
9. Logout clears the cookie. When the token expires, the administrator logs in again; refresh tokens are not necessary for the first MVP.

Because cookie authentication is used, production requests must use HTTPS, restrictive CORS, suitable `SameSite` settings, and CSRF protection or strict origin checks for mutations.

## 11. Frontend Architecture and Pages

### Public pages

- Home page with live, upcoming, and recent matches.
- Public team list and team profile.
- Public player profile and career statistics.
- Public match page with teams, lineup, live scoreboard, timeline, YouTube embed, result, photos, and Man of the Match.
- Friendly loading, empty, offline, and error states.

### Authentication and shared admin pages

- Admin login.
- Admin layout with responsive navigation.
- Profile and change-password page.
- Protected routes based on the authenticated role.

### Super-admin pages

- Dashboard.
- Team list, create/edit team, publish/archive controls.
- Team-admin list, create/edit account, activate/deactivate, reset password, and team assignment.
- Access to all team data for support and correction.

### Team-admin pages

- Team dashboard and team profile editor.
- Permanent squad list and player-card editor.
- Match list and match creation/editor.
- Starting XI and substitutes selector.
- Live match-control screen with large event actions and undo.
- Completed-match editor for result, photos, and Man of the Match.
- Team and player statistics views.

Reusable components should cover forms, confirmation dialogs, status badges, player cards, image inputs, tables/lists, pagination, scoreboards, timelines, and protected navigation. The live match-control screen must be easy to operate on a phone and must ask for confirmation before high-impact actions where accidental taps are likely.

## 12. Live Match and Statistics Rules

### Score changes

- A team `goal` or `penaltyScored` adds one to the team score.
- An opponent `goal` or `penaltyScored` adds one to the opponent score.
- An own goal adds one to the opposite side.
- Assists, cards, substitutions, missed penalties, and saved penalties do not change the score.
- Score is recalculated from active events after creation or undo instead of relying only on client-supplied totals.

### Event validation

- Only `live` matches accept live events.
- Selected FootStream players must belong to the match squad.
- A substitution requires one player out and one player in.
- An assist must be associated with a goal context; the exact UI may record goal and assist together while the backend stores compatible event data.
- The client cannot decide authorization, event sequence, or final score.

### Undo

- Undo selects the latest non-undone event by server-assigned sequence.
- The event is marked undone, not deleted.
- The score is recalculated from all remaining active events.
- Socket.IO broadcasts the corrected score and timeline in Phase 4.
- The live-control UI identifies which event will be undone and requires confirmation.

### Statistics

- Only completed matches count toward career and team statistics.
- Starting XI and substitute appearances are derived from lineup and substitution records.
- Undone events never count.
- Reopening or correcting a match automatically changes calculated statistics.
- Historical snapshots preserve the displayed player name and number even if the permanent player card later changes.

## 13. Security and Data Protection

The MVP uses simple, necessary protections:

- Hash passwords with `bcryptjs`; never store or log plain-text passwords.
- Store the JWT secret and initial seed credentials in `.env`, with only variable names in `.env.example`.
- Validate and sanitize inputs; Mongoose validation alone is not a substitute for request validation.
- Verify role and team ownership in backend middleware and service rules.
- Limit login attempts and use generic invalid-credential messages.
- Restrict CORS to the frontend origin.
- Use Helmet security headers and production HTTPS.
- Restrict uploads to allowed image MIME types and extensions, enforce size limits, generate unique file names, and never execute uploaded content.
- Accept only valid YouTube video/live URLs, extract the video ID on the server, and render it through an allowlisted YouTube embed URL.
- Do not commit `.env`, uploaded development files, database exports, or secrets.
- Back up the production MongoDB database and uploaded images once deployment begins.

## 14. Testing and Definition of Done

Every phase should include focused tests rather than postponing all testing until deployment.

### Important automated tests

- Login success/failure, inactive users, expired/invalid JWTs, and role restrictions.
- Team admins cannot read or modify another team's protected data.
- Player validation, unique active jersey numbers, archive behavior, and lineup eligibility.
- Match status changes and lineup validation.
- Every match-event score effect, own goals, penalties, substitutions, sequence creation, and undo.
- Statistics exclude scheduled matches and undone events.
- Public APIs exclude unpublished and private fields.
- Critical React pages render success, empty, loading, and error states.

### Feature definition of done

A feature is done when:

- backend authorization and validation are implemented;
- the responsive frontend workflow is complete;
- important business rules have automated tests;
- errors are understandable to the administrator or viewer;
- no secrets or private fields are exposed;
- related documentation is updated;
- the complete application still installs, runs, tests, and builds with npm.

## 15. Phase-Wise Implementation Roadmap

Each phase should be usable and tested before starting the next one.

### Phase 1 — Project setup, authentication, and administration

#### Deliverables

- Create the `backend/` Express application and `frontend/` React/Vite application using npm.
- Configure Tailwind CSS, React Router, Axios, ESLint, Prettier, and environment examples.
- Connect Express/Mongoose to localhost MongoDB.
- Add common error handling, input validation, CORS, Helmet, and login rate limiting.
- Create the `users` and `teams` schemas.
- Create the one-time initial super-admin seed script.
- Implement JWT login, logout, current-user loading, password change, protected routes, and role middleware.
- Build the super-admin dashboard.
- Implement team creation/editing/publishing/archiving.
- Implement team-admin creation, activation/deactivation, password reset, and assignment to a team.
- Build the basic team-admin dashboard and restrict it to the assigned team.

#### Phase 1 completion criteria

- A seeded super admin can log in.
- The super admin can create a team and its team-admin account.
- A team admin can log in but cannot access another team's data or super-admin pages.
- There is no registration page or registration API.

### Phase 2 — Permanent squad and player cards

#### Deliverables

- Create the player schema and indexes.
- Build player create, edit, archive, restore, list, and detail endpoints.
- Build permanent squad management for team admins.
- Add player cards with photo, name, position, age, academic year, jersey number, and availability.
- Add image upload validation and local development storage.
- Add public-ready player slugs while keeping pages unpublished until Phase 6.

#### Phase 2 completion criteria

- A team admin can maintain a permanent player pool only for their team.
- Player validation and active jersey-number uniqueness work.
- Archived players do not disappear from historical references.

### Phase 3 — Match creation and squad selection

#### Deliverables

- Create the match schema.
- Build match list, create, view, and edit workflows.
- Allow opponent entry using only a name.
- Allow optional temporary opponent player names.
- Add kickoff, venue, home/away, publication, and YouTube URL fields.
- Build starting XI and substitutes selection from available permanent players.
- Validate exactly 11 starting players and prevent duplicate selection.
- Store lineup display snapshots for history.

#### Phase 3 completion criteria

- A team admin can schedule a match against a name-only opponent.
- Starting XI and substitutes contain valid, non-duplicated players from the assigned team.
- Editing a player's card later does not corrupt the stored match lineup display.

### Phase 4 — Live match control and real-time scoreboard

#### Deliverables

- Create the match-event schema and match event service.
- Build match start, completion, and cancellation controls.
- Build the responsive live-control screen and scoreboard.
- Implement goal, assist, yellow card, red card, substitution, penalty scored/missed/saved, and own-goal events.
- Calculate score on the backend from active events.
- Add server-assigned event sequence numbers.
- Implement undo-last-event with score recalculation.
- Add Socket.IO to the existing Express server and React frontend.
- Broadcast match status, score, event, and undo updates to a room for that match.
- Add reconnect behavior that reloads the latest REST match state.

#### Phase 4 completion criteria

- An authorized team admin can operate a match from start to completion.
- Multiple public test browsers receive live score and event updates.
- Refreshing or reconnecting shows the authoritative database state.
- Undo reverses only the latest active event and produces the correct score and timeline.

### Phase 5 — Results, statistics, photos, and Man of the Match

#### Deliverables

- Finalize and display match result summaries.
- Add Man of the Match selection from the FootStream match squad.
- Add match-photo upload, caption, list, and delete features.
- Calculate player appearances, starts, goals, assists, cards, own goals, penalties, and awards.
- Calculate team matches played, wins, draws, losses, goals for, and goals against.
- Build team match-history and admin statistics screens.
- Ensure corrections and undone events are reflected in calculated statistics.

#### Phase 5 completion criteria

- Completing a match produces a correct result and updates team/player statistics.
- Photos and Man of the Match are attached to the correct match.
- Statistics can be reproduced from completed match and event data.

### Phase 6 — YouTube Live, public pages, and deployment

#### Deliverables

- Validate YouTube URLs and store only the extracted video ID.
- Embed YouTube Live on the public match page with a clear no-stream state.
- Build public home, team, player, match, live scoreboard, result, history, photo, and statistics pages.
- Ensure public pages expose published data only and work without an account.
- Complete responsive, accessibility, metadata, empty-state, and loading-state review.
- Add production environment configuration and build scripts.
- Select currently suitable free deployment options for the static frontend, Node backend, MongoDB, and image storage if persistent local files are unavailable.
- Configure production CORS, secure cookies, HTTPS, environment secrets, database indexes, backups, and health endpoint.
- Run final API, browser, security, and production-build checks.

#### Phase 6 completion criteria

- A public viewer can use all published pages without signing in.
- A live match page shows the YouTube embed, live score, and event timeline.
- The deployed admin workflows retain correct role/team restrictions.
- Data and uploaded photos persist on the selected deployment setup.

## 16. Deployment Plan

Local development does not require Docker:

1. Install a supported Node.js release and npm.
2. Install and run MongoDB locally.
3. Run `npm install` separately inside `backend/` and `frontend/`.
4. Configure each application from its `.env.example`.
5. Run the backend and Vite development servers in separate terminals.

For Phase 6, deploy three simple concerns:

- the Vite production build on a static web host;
- the Express/Socket.IO application on a Node.js host that supports WebSockets;
- MongoDB on a suitable hosted database free tier or a maintained server.

Image storage must be persistent. If the backend host has an ephemeral filesystem, use a free-compatible image storage provider or a host with persistent disk rather than storing uploads inside the deployed container. The exact free host should be chosen during Phase 6 because free-tier offerings change.

Deployment uses environment variables for the MongoDB connection, JWT secret, allowed frontend origin, cookie settings, and upload configuration. Run database backups and keep a documented restore procedure. No Docker, Redis, queue, worker, microservice, or paid platform is required by the architecture.

## 17. Future Growth Without Premature Infrastructure

The first scaling steps are code and database improvements, not new services:

- add or tune MongoDB indexes based on slow queries;
- paginate long player, match, and event lists;
- optimize image sizes and serve static assets efficiently;
- separate frontend components and backend services by feature;
- run more than one backend instance only if traffic requires it;
- cache public responses only after measurements show a bottleneck;
- move images to durable object storage when deployment requires it;
- add external infrastructure only when a measured limitation justifies it.

The permanent player pool, event timeline, lineup snapshots, and calculated-statistics design support additional football features later without turning the MVP into a microservice system.

## 18. Approval Gate

This plan now fixes the MVP choices: JavaScript, npm, `backend/` and `frontend/`, React/Vite/Tailwind, Express/MongoDB/Mongoose, JWT/bcryptjs, localhost MongoDB, YouTube embeds, public account-free viewing, super-admin-created team admins, and Socket.IO in Phase 4.

Implementation must not begin until this revised plan is approved.
