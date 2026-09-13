import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 10;
// Shared plaintext for every seeded user, so the API is usable in dev.
const SEED_PASSWORD = 'password123';

type SeedUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

type SeedThread = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const users: SeedUser[] = [
  {
    id: 'U001',
    username: 'johndoe',
    email: 'johndoe@example.com',
    createdAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'U002',
    username: 'janedoe',
    email: 'jane@example.com',
    createdAt: '2026-04-21T14:30:00Z',
  },
  {
    id: 'U003',
    username: 'arif_dev',
    email: 'arif@example.com',
    createdAt: '2026-04-22T07:30:00Z',
  },
  {
    id: 'U004',
    username: 'sarah_codes',
    email: 'sarah@example.com',
    createdAt: '2026-04-23T09:10:00Z',
  },
  {
    id: 'U005',
    username: 'miguel_dev',
    email: 'miguel@example.com',
    createdAt: '2026-04-24T12:45:00Z',
  },
  {
    id: 'U006',
    username: 'priya_sharma',
    email: 'priya@example.com',
    createdAt: '2026-04-25T16:20:00Z',
  },
  {
    id: 'U007',
    username: 'tom_baker',
    email: 'tom@example.com',
    createdAt: '2026-04-27T08:05:00Z',
  },
  {
    id: 'U008',
    username: 'lena_k',
    email: 'lena@example.com',
    createdAt: '2026-04-29T13:40:00Z',
  },
];

const threads: SeedThread[] = [
  {
    id: 'T101',
    userId: 'U001',
    title: 'How do I set up environment variables in Node.js?',
    content:
      'I am new to backend development and confused about how to hide my API keys. Could someone explain how to use dotenv?',
    createdAt: '2026-04-22T08:15:00Z',
    updatedAt: '2026-04-22T08:15:00Z',
  },
  {
    id: 'T102',
    userId: 'U002',
    title: 'When should I use PostgreSQL vs MongoDB?',
    content:
      'For a medium-scale e-commerce project, which database is more recommended and why?',
    createdAt: '2026-04-22T09:45:00Z',
    updatedAt: '2026-04-22T10:00:00Z',
  },
  {
    id: 'T103',
    userId: 'U001',
    title: 'Getting a CORS error when hitting the API from React',
    content:
      "I keep getting an 'Access-Control-Allow-Origin' error. How do I handle this on the Express.js side?",
    createdAt: '2026-04-22T11:20:00Z',
    updatedAt: '2026-04-22T11:20:00Z',
  },
  {
    id: 'T104',
    userId: 'U003',
    title: 'Prisma migrate deploy fails in CI with shadow database error',
    content:
      'My pipeline runs prisma migrate deploy against a fresh Postgres container and fails with P3014. Do I need a shadow database, or is that only for migrate dev?',
    createdAt: '2026-04-22T13:05:00Z',
    updatedAt: '2026-04-22T13:05:00Z',
  },
  {
    id: 'T105',
    userId: 'U004',
    title: 'JWT refresh token strategy in NestJS',
    content:
      'I have short-lived access tokens working, but I am unsure how to rotate refresh tokens safely. Should refresh tokens live in a database table or just be signed JWTs?',
    createdAt: '2026-04-22T15:40:00Z',
    updatedAt: '2026-04-22T16:10:00Z',
  },
  {
    id: 'T106',
    userId: 'U002',
    title: 'bcrypt vs argon2 for password hashing',
    content:
      'I am using bcrypt with cost 10 right now. Is argon2 worth switching to, and does it matter for a small project?',
    createdAt: '2026-04-23T08:25:00Z',
    updatedAt: '2026-04-23T08:25:00Z',
  },
  {
    id: 'T107',
    userId: 'U005',
    title: 'How to validate request bodies with class-validator',
    content:
      'My DTO validation silently ignores unknown fields. I want the API to reject extra properties instead of stripping them. What pipe configuration do I need?',
    createdAt: '2026-04-23T10:50:00Z',
    updatedAt: '2026-04-23T11:15:00Z',
  },
  {
    id: 'T108',
    userId: 'U003',
    title: 'Docker Compose healthcheck for Postgres',
    content:
      'My NestJS container starts before Postgres is ready and crashes. How do I write a reliable healthcheck and wait for the database?',
    createdAt: '2026-04-23T14:00:00Z',
    updatedAt: '2026-04-23T14:00:00Z',
  },
  {
    id: 'T109',
    userId: 'U006',
    title: 'Prisma relation filtering with a nested where',
    content:
      'I want to fetch only users who have at least one thread created this week. Can I express that as a nested relation filter, or do I need a raw query?',
    createdAt: '2026-04-24T09:30:00Z',
    updatedAt: '2026-04-24T09:30:00Z',
  },
  {
    id: 'T110',
    userId: 'U001',
    title: 'ESLint and Prettier keep fighting on save',
    content:
      'Every time I save, ESLint reformats what Prettier just wrote. How do I make them agree instead of toggling back and forth?',
    createdAt: '2026-04-24T11:05:00Z',
    updatedAt: '2026-04-24T11:05:00Z',
  },
  {
    id: 'T111',
    userId: 'U007',
    title: 'NestJS guards vs middleware for auth',
    content:
      'Both run before the controller. When should I reach for a guard instead of middleware for checking a token?',
    createdAt: '2026-04-24T13:20:00Z',
    updatedAt: '2026-04-24T13:55:00Z',
  },
  {
    id: 'T112',
    userId: 'U004',
    title: 'Handling 404 when Prisma findUnique returns null',
    content:
      'My service returns null and the controller sends a 200 with an empty body. What is the cleanest way to turn that into a NotFoundException?',
    createdAt: '2026-04-24T16:45:00Z',
    updatedAt: '2026-04-24T16:45:00Z',
  },
  {
    id: 'T113',
    userId: 'U008',
    title: 'E2E testing a NestJS app with supertest',
    content:
      'I want e2e tests to hit a real Postgres instance, not mocks. How do I wire the test app so it uses the same modules as production?',
    createdAt: '2026-04-25T08:15:00Z',
    updatedAt: '2026-04-25T08:40:00Z',
  },
  {
    id: 'T114',
    userId: 'U005',
    title: 'Prisma connection pool exhausted under load',
    content:
      'After a few hundred concurrent requests I see P2024 timeouts. What knobs control the pool size, and should I tune them or add PgBouncer?',
    createdAt: '2026-04-25T10:30:00Z',
    updatedAt: '2026-04-25T10:30:00Z',
  },
  {
    id: 'T115',
    userId: 'U002',
    title: 'Should I use snake_case or camelCase in Prisma models?',
    content:
      'My database team prefers snake_case columns but my TypeScript code is camelCase. What is the least painful way to reconcile the two?',
    createdAt: '2026-04-25T14:10:00Z',
    updatedAt: '2026-04-25T14:35:00Z',
  },
  {
    id: 'T116',
    userId: 'U006',
    title: 'Rate limiting the login endpoint',
    content:
      'I want to block brute-force attempts against login without locking out legitimate users. What throttling strategy do you recommend?',
    createdAt: '2026-04-26T09:00:00Z',
    updatedAt: '2026-04-26T09:00:00Z',
  },
  {
    id: 'T117',
    userId: 'U007',
    title: 'Prisma seed script best practices',
    content:
      'Should a seed script be idempotent? I keep hitting unique constraint errors when I run it twice during development.',
    createdAt: '2026-04-26T11:25:00Z',
    updatedAt: '2026-04-26T11:50:00Z',
  },
  {
    id: 'T118',
    userId: 'U008',
    title: 'NestJS ConfigService with validation schema',
    content:
      'I want the app to fail fast at boot when DATABASE_URL is missing, instead of crashing later on the first query. How do I validate environment variables at startup?',
    createdAt: '2026-04-27T08:40:00Z',
    updatedAt: '2026-04-27T08:40:00Z',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);

  for (const user of users) {
    const data = {
      username: user.username,
      email: user.email,
      passwordHash,
      createdAt: new Date(user.createdAt),
    };
    await prisma.user.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data },
    });
  }

  for (const thread of threads) {
    const data = {
      userId: thread.userId,
      title: thread.title,
      content: thread.content,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
    };
    await prisma.thread.upsert({
      where: { id: thread.id },
      update: data,
      create: { id: thread.id, ...data },
    });
  }

  console.log(`Seeded ${users.length} users and ${threads.length} threads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
