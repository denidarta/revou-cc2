import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './test-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
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

  describe('POST /api/auth/register', () => {
    it('registers a user and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'johndoe',
          email: 'johndoe@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        username: 'johndoe',
        email: 'johndoe@example.com',
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 400 for duplicate username', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'johndoe',
          email: 'a@example.com',
          password: 'password123',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'johndoe',
          email: 'b@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('returns 400 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'johndoe',
          email: 'dup@example.com',
          password: 'password123',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'janedoe',
          email: 'dup@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('returns 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'johndoe',
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('returns 400 for short username', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'ab',
          email: 'ok@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('returns 400 for short password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'johndoe',
          email: 'ok@example.com',
          password: 'short',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    const credentials = {
      email: 'johndoe@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ username: 'johndoe', ...credentials })
        .expect(201);
    });

    it('returns 200 with an accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('returns 400 for missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: credentials.password })
        .expect(400);
    });

    it('returns 400 for missing password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: credentials.email })
        .expect(400);
    });
  });
});
