# Multiplayer Game Server Platform

**Production-Grade, Minimal, Plug-and-Play Backend for Indie Game Developers**

A generic, real-time multiplayer game server platform built with NestJS, PostgreSQL, and Redis. Supports multiple games (projects) with low-latency WebSocket gameplay, JWT auth, and deterministic matchmaking. Designed as a portfolio-ready backend that indie devs can connect their games to.

[
[
[
[

## 🎯 Overview

This is **not a game**—it's a reusable multiplayer backend using a generic Entity/Actor-based game state model. Indie developers connect their game clients via REST (setup) and WebSockets (gameplay).

**Key Features:**
- Multi-tenant: Single server supports multiple games/projects
- Real-time WebSocket gameplay with low-latency state sync
- Deterministic FIFO matchmaking
- JWT auth with refresh tokens
- PostgreSQL snapshots + Redis hot cache
- Dockerized, production-ready
- Swagger API docs + sample frontend demo

## 🧱 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | NestJS (TypeScript) |
| API | REST (setup) + WebSockets (gameplay) |
| Database | PostgreSQL (snapshots, history) |
| Cache | Redis (hot game state) |
| Auth | JWT (access + refresh) |
| Container | Docker + Docker Compose |
| Testing | Jest unit tests |
| Docs | Swagger/OpenAPI |

## 🚀 Quick Start

1. Clone and install:
   ```bash
   git clone <repo-url>
   cd multiplayer-game-server
   npm install
   ```

2. Start with Docker:
   ```bash
   docker-compose up -d
   ```

3. API ready at `http://localhost:3000`
4. Swagger docs: `http://localhost:3000/api`
5. Sample game: `http://localhost:3001`

## 🌐 API Structure

### REST Endpoints (Setup & Management)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | JWT login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |
| POST | `/projects` | Create project |
| GET | `/projects` | List user projects |
| GET | `/projects/:projectId` | Get project |
| POST | `/projects/:projectId/matches` | Manual match creation |
| GET | `/projects/:projectId/matches` | List matches |
| GET | `/projects/:projectId/matches/:matchId` | Get match details |
| GET | `/health` | Health check |

**❗ Gameplay uses WebSockets only (no REST)**

### WebSocket Events (Gameplay)

**Connection:** `{ projectId, accessToken }`

| Event | Direction | Description |
|-------|-----------|-------------|
| `matchmaking.join` | Client → Server | Join queue |
| `matchmaking.leave` | Client → Server | Leave queue |
| `match.found` | Server → Client | Match ready |
| `actor.spawn` | Client → Server | Spawn actor |
| `actor.update` | Client → Server | Update actor |
| `actor.remove` | Client → Server | Remove actor |
| `state.sync` | Server → Client | Full state sync |
| `error.*` | Server → Client | Errors |

## 🗄️ Database Schemas

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects (Multi-tenant games)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  max_players_per_match INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  status VARCHAR(50) DEFAULT 'waiting', -- waiting, active, finished
  players JSONB, -- Array of {userId, socketId, actorId}
  state_snapshot JSONB, -- Latest game state
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

## 🧩 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Game Clients  │◄──►│ WebSocket Gateway│◄──►│ Matchmake Engine│
│ (Sample Frontend)│    │ (Gameplay)       │    │ (FIFO Queues)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                         ┌──────────────────┐
                         │   Game Engine    │──┐
                         │ (Actor/State)    │  │
                         └──────────────────┘  │
                                │              │
                       ┌──────────────────┐    │
                       │ Redis (Cache)    │◄───┘
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │ PostgreSQL       │
                       │ (Snapshots)      │
                       └──────────────────┘
```

**Data Flow:**
1. In-memory for live matches (fast)
2. Redis cache for hot state (low-latency reads)
3. PostgreSQL snapshots on match end (persistence)

## 🎮 Sample Frontend Game

Includes a minimal HTML5 Canvas game at `http://localhost:3001`:

- Login/register
- Create project
- Join matchmaking
- Spawn/move player (circle)
- Real-time updates from other players
- No UI polish—pure functionality demo

```html
<!-- See /client/index.html for full example -->
<canvas id="game" width="800" height="600"></canvas>
```

## 🧪 Testing

```bash
npm run test
```

Coverage: Auth, matchmaking, game state services. Mocks for DB/Redis.

## 📚 Development Phases

Built in 7 phases for clean architecture:

1. **Foundation**: Docker, DB, health
2. **Auth & Projects**: JWT, multi-tenancy
3. **Matchmaking**: FIFO queues, room creation
4. **Game Engine**: WebSockets, actor sync
5. **Persistence**: Snapshots, history
6. **Frontend**: Sample client
7. **Polish**: Tests, docs

## 🤝 For Indie Developers

**Integration in 3 steps:**

1. **Setup**: Register → Create project → Get `projectId`
2. **Connect**: WebSocket with `{ projectId, accessToken }`
3. **Play**:
   ```typescript
   ws.send('matchmaking.join');
   // Receive: match.found
   ws.send('actor.spawn', { id: 'player1', x: 100, y: 100 });
   ws.send('actor.update', { id: 'player1', x: 150 });
   // Receive: state.sync
   ```

**Your game logic runs client-side. Server syncs state.**

## 🚀 Production Decisions

- **Single-node**: No distributed complexity
- **Redis-only caching**: No persistence overhead
- **Event-driven**: Zero blocking WebSocket handlers
- **DTO validation**: Type-safe payloads
- **Rate limiting**: Abuse protection
- **Graceful cleanup**: Match state on disconnect

## 📁 Folder Structure

```
├── src/
│   ├── auth/           # JWT guards, services
│   ├── projects/       # Multi-tenant logic
│   ├── matches/        # Matchmaking engine
│   ├── game/           # WebSocket gateway, actors
│   ├── common/         # DTOs, validators
│   └── app.module.ts
├── client/             # Sample HTML/JS game
├── test/               # Unit tests
├── docker-compose.yml
├── Dockerfile
└── README.md
```