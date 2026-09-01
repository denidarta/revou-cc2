import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './test-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a public profile without email or passwordHash', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'johndoe',
        email: 'johndoe@example.com',
        password: 'password123',
      })
      .expect(201);

    const id = registerRes.body.id;

    const res = await request(app.getHttpServer())
      .get(`/api/users/${id}`)
      .expect(200);

    expect(res.body).toMatchObject({ id, username: 'johndoe' });
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.email).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 404 for an unknown user', async () => {
    await request(app.getHttpServer())
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
