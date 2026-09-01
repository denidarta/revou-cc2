# Q&A Forum API

A simple RESTful Q&A forum: register, log in with JWT, and create/read/update/delete
your own discussion threads.

## Features

- **User management** — register, log in (JWT), and view public profiles.
- **Thread CRUD** — create, read, update, and delete discussion threads.
- **Ownership control** — users can only update or delete threads they created.
- **Validation & error handling** — appropriate HTTP status codes (400, 401, 403, 404, 500).
- **Database relations** — one-to-many: a user can create many threads.

## Stack

NestJS (TypeScript) · PostgreSQL · Prisma · JWT (passport-jwt) · bcrypt · Swagger

## Data Model

| Model | Fields |
| --- | --- |
| `User` | `id` (UUID), `username` (unique), `email` (unique), `passwordHash`, `createdAt` |
| `Thread` | `id` (UUID), `userId`, `title`, `content`, `createdAt`, `updatedAt` |

One-to-many relation: each `Thread` belongs to one `User` via `userId`; a single
`User` can own many `Thread`s.

## Validation Rules

| Field | Rule |
| --- | --- |
| `username` | required, 3–30 chars, unique |
| `email` | required, valid email format, unique |
| `password` | required, min 8 chars |
| thread `title` | required, 3–200 chars |
| thread `content` | required, 10–5000 chars |

Passwords are hashed with bcrypt (cost factor 10) before being stored; the plain
password is never returned by the API.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env template and fill in secrets:
   ```bash
   cp .env.example .env
   ```

3. Start Postgres:
   ```bash
   docker compose up -d db
   ```

4. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the API:
   ```bash
   npm run start:dev
   ```

Swagger UI is served at http://localhost:3000/api/docs.

## Environment Variables

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `1h`) |

## Testing

Requires the test database:

```bash
docker compose up -d db_test
npm run test:e2e
```

## API

All routes are prefixed with `/api`. Authenticated endpoints require a JWT in the
`Authorization: Bearer <token>` header (returned by `POST /api/auth/login`).

### Auth & Users

| Method | Endpoint | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | No | 201 | 400 |
| POST | `/api/auth/login` | No | 200 | 400, 401 |
| GET | `/api/users/:id` | No | 200 | 404 |

`GET /api/users/:id` returns a public profile only — `email` and `passwordHash`
are never exposed.

### Threads

| Method | Endpoint | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/threads` | Yes | 201 | 400, 401 |
| GET | `/api/threads` | No | 200 | — |
| GET | `/api/threads/my-threads` | Yes | 200 | 401 |
| GET | `/api/threads/:id` | No | 200 | 404 |
| PUT | `/api/threads/:id` | Yes | 200 | 400, 401, 403, 404 |
| DELETE | `/api/threads/:id` | Yes | 204 | 401, 403, 404 |

`GET /api/threads` is paginated: `?page` (default `1`) and `?limit`
(default `10`, max `50`). The response shape is `{ data, page, limit, total }`.

`PUT` and `DELETE` are owner-only — a non-owner receives `403`.
