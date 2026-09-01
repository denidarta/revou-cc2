# Q&A Forum API

A simple RESTful Q&A forum: register, log in with JWT, and create/read/update/delete
your own discussion threads.

## Stack

NestJS (TypeScript) · PostgreSQL · Prisma · JWT (passport-jwt) · bcrypt · Swagger

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

### Auth & Users

| Method | Endpoint | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | No | 201 | 400 |
| POST | `/api/auth/login` | No | 200 | 400, 401 |
| GET | `/api/users/:id` | No | 200 | 404 |

### Threads

| Method | Endpoint | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/threads` | Yes | 201 | 400, 401 |
| GET | `/api/threads` | No | 200 | — |
| GET | `/api/threads/my-threads` | Yes | 200 | 401 |
| GET | `/api/threads/:id` | No | 200 | 404 |
| PUT | `/api/threads/:id` | Yes | 200 | 400, 401, 403, 404 |
| DELETE | `/api/threads/:id` | Yes | 204 | 401, 403, 404 |

## Screenshots

Swagger UI documentation screenshots live in [`docs/screenshots/`](docs/screenshots).
