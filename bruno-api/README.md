# bruno-api

Executable API tests for the Q&A Forum API (NestJS + Prisma) that lives in the
repository root. The collection is stored in the **OpenCollection** YAML format
(`opencollection.yml` at the root, one `.yml` per request, `folder.yml` per
folder), which [Bruno](https://www.usebruno.com) reads and writes natively.

## Prerequisites

Start the API and make sure its database is reachable:

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / JWT_SECRET
npx prisma migrate dev
npm run start:dev      # serves http://localhost:3000
```

Confirm it is up by running the **Health / Check Health** request (or
`curl http://localhost:3000/api/health`).

## Environment

One environment lives in [`environments/local.yml`](./environments/local.yml):

| Variable | Default | Filled in by |
| --- | --- | --- |
| `port` | `3000` | environment file — mirror of `PORT` in the root `.env` |
| `baseUrl` | `http://localhost:{{port}}` | derived from `port` (override with `--env-var baseUrl=…`) |
| `username` / `email` / `password` | empty | `Auth / Register` (generated per run) |
| `userId` | empty | `Auth / Register` |
| `token` | empty | `Auth / Login` |
| `threadId` | empty | `Threads / Create Thread` |

The port is not re-read from `.env` automatically: keep `port` in `local.yml`
aligned with `PORT` when you change the latter. `DATABASE_URL`,
`JWT_SECRET`, and `JWT_EXPIRES_IN` are server-side settings and are
deliberately **not** copied here — the collection never needs the signing
secret, and committing it would leak it.

The values marked "filled in by" are held as **runtime variables**
(`bru.setVar` / `bru.getVar`): they live only for the duration of a run and are
never written back to `environments/local.yml`, so no tokens or generated
credentials end up in the repo. They are listed in the environment file only so
you can pre-seed one with `--env-var` to run a single request in isolation.

## Structure

Folders and requests carry `seq` numbers; both the GUI and the CLI run them in
that order, so a single run walks the whole flow.

| Folder | `seq` | Requests |
| --- | --- | --- |
| `Health` | 1 | Check Health |
| `Auth` | 2 | Register, Login, `[400]`/`[401]` negative cases |
| `Users` | 3 | Get User Profile, `[404]` unknown user |
| `Threads` | 4 | Create, List, List My Threads, Get, Update, Delete + guardrail cases |

`[400]`, `[401]`, and `[404]` prefixed requests are deliberate negative cases:
they assert the error status the API documents.

## Running

**In the Bruno app:** *Open Collection* → select this `bruno-api` folder → pick
the `local` environment in the top-right → run a folder, a single request, or
the whole collection.

**With the Bruno CLI** (`npm install -g @usebruno/cli`, which provides `bru`):

```bash
# whole collection, in seq order
bru run --env local

# a single folder or request
bru run Threads --env local
bru run "Threads/Create Thread.yml" --env local
```

A full run does, in order: check health → register a fresh user → log in →
read the profile → create a thread → list/read it → update it → delete it →
confirm it is gone. Every request asserts the response status and, where it
matters, the response *shape and intent* (the author is attributed correctly,
private fields are not leaked, the deleted thread really returns `404`).

## Notes

- **Rate limiting:** `POST /api/threads` allows 5 requests/minute per user.
  Running the whole collection five times within a minute will return `429`;
  wait out the window or use a different registered user.
- **Repeatable by design:** `Register` generates a unique username/email from
  `Date.now()` each run, so re-running against a database that already contains
  previous runs will not fail on the unique constraints.
- **Manual tokens:** if you already have a JWT, you can skip Register/Login and
  pass it directly: `bru run Threads --env local --env-var token=<jwt>`.
- **Ownership errors:** the `403` cases (a non-owner updating or deleting a
  thread) need a second authenticated user; Register/Login a second identity and
  swap `{{token}}` to try them by hand.
