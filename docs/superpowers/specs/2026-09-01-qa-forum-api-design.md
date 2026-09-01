# Q&A Forum API — Design Spec

Date: 2026-09-01
Status: Approved

## Objective

RESTful API for a simple Q&A forum: users register/login, create threads
(questions), read/update/delete their own threads. Auth required for
write/personal actions; enforce ownership on update/delete.

## Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (stateless), `@nestjs/passport` + `passport-jwt`
- **Password hashing**: bcrypt, cost factor 10
- **Validation**: `class-validator` / `class-transformer` via global `ValidationPipe`
- **API docs**: `@nestjs/swagger`, served at `/api/docs`
- **Local DB**: docker-compose Postgres service
- **IDs**: UUID (`@default(uuid())`) for both `User` and `Thread`

## Architecture

Modular monolith, layered Controller → Service → Prisma per module:

- `PrismaModule` — shared `PrismaService` (global module)
- `AuthModule` — register, login, `JwtStrategy`, `JwtAuthGuard`
- `UsersModule` — public profile lookup
- `ThreadsModule` — thread CRUD
- `CommonModule`/shared — global exception filter, `@CurrentUser()` decorator

Config via `@nestjs/config`, backed by `.env`:
```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/qa_forum
JWT_SECRET=<secret>
JWT_EXPIRES_IN=1h
```

Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
applied in `main.ts`. Global exception filter normalizes error responses to:
```json
{ "statusCode": 400, "message": "...", "error": "Bad Request" }
```

## Data Model

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  threads      Thread[]
}

model Thread {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

One-to-many: one `User` → many `Thread`, via `Thread.userId` FK.
`onDelete: Cascade` keeps DB consistent (no user-delete endpoint in scope,
but avoids orphaned threads if manually removed). `username` and `email`
unique — duplicate registration returns 400.

## Validation Rules

- `username`: required, non-empty string, 3–30 chars, unique
- `email`: required, valid email format (`@IsEmail()`), unique
- `password`: required, min 8 chars
- Thread `title`: required, non-empty, 3–200 chars
- Thread `content`: required, non-empty, 10–5000 chars

## Endpoints

### Auth & Users

| Method | Endpoint | Auth | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | 201 `{id, username, email, createdAt}` | 400 (validation / duplicate username or email) |
| POST | `/api/auth/login` | No | 200 `{accessToken}` | 400 (empty fields), 401 (invalid credentials) |
| GET | `/api/users/:id` | No | 200 `{id, username, createdAt}` | 404 (not found) |

`GET /api/users/:id` never returns `email` or `passwordHash` (public profile only).

### Threads

| Method | Endpoint | Auth | Success | Errors |
|---|---|---|---|---|
| POST | `/api/threads` | Yes | 201 thread object | 400 (validation), 401 |
| GET | `/api/threads` | No | 200 `{data: Thread[], page, limit, total}` | — |
| GET | `/api/threads/my-threads` | Yes | 200 `Thread[]` (current user's) | 401 |
| GET | `/api/threads/:id` | No | 200 thread + `author: {id, username}` | 404 |
| PUT | `/api/threads/:id` | Yes | 200 updated thread | 400 (validation), 401, 403 (not owner), 404 (not found) |
| DELETE | `/api/threads/:id` | Yes | 204 no content | 401, 403 (not owner), 404 (not found) |

`GET /api/threads` pagination: `?page` (default 1), `?limit` (default 10, max 50).

**Route order note**: `GET /api/threads/my-threads` must be registered
before `GET /api/threads/:id` in the controller so it isn't shadowed by
the `:id` param route.

### Ownership Check (PUT/DELETE thread)

1. Load thread by `id`. Not found → 404.
2. Compare `thread.userId` to `req.user.id` (from JWT). Mismatch → 403.
3. Only then apply update/delete.

## Error Handling

Global exception filter maps:
- `ValidationPipe` failures → 400
- `UnauthorizedException` (missing/invalid/expired JWT, bad login) → 401
- `ForbiddenException` (not thread owner) → 403
- `NotFoundException` (user/thread not found) → 404
- Uncaught exceptions → 500, logged server-side, generic message to client (no stack trace leak)

## Testing

Jest e2e suite (NestJS default `supertest`-based) against a real Postgres
test database (separate schema or docker-compose service), covering:
- register: success, duplicate username/email (400), invalid email (400)
- login: success, wrong password (401), missing fields (400)
- thread create: success (201), missing auth (401), empty title (400)
- thread list: public access, pagination params
- thread get by id: found (200), not found (404)
- thread update/delete: owner success, non-owner (403), missing (404), unauthenticated (401)

Light unit tests for service-level logic (e.g., password hashing call,
ownership comparison) where e2e doesn't already exercise the branch.

## Documentation Deliverable

`@nestjs/swagger` decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`,
`@ApiBearerAuth`) on every controller method, covering each status code
in the endpoint tables above. Swagger UI served at `/api/docs`.
Screenshots taken from this UI per submission requirements.

## Repo Layout

```
src/
  auth/          controller, service, dto, jwt.strategy.ts, jwt-auth.guard.ts
  users/         controller, service, dto
  threads/       controller, service, dto
  prisma/        prisma.service.ts, prisma.module.ts
  common/        http-exception.filter.ts, current-user.decorator.ts
  main.ts, app.module.ts
prisma/
  schema.prisma
  migrations/
docker-compose.yml   (postgres service)
.env.example
README.md            (setup steps, .env instructions, screenshots)
```

## Out of Scope

- Refresh tokens / logout / token revocation
- Editing user profile or password
- Thread comments/replies (spec only asks for threads)
- Rate limiting
- Soft-delete for threads
