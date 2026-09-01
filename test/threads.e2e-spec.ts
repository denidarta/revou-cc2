import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDatabase } from './test-app';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'password123';
const TITLE = 'How do I set up environment variables?';
const CONTENT = 'I keep leaking API keys. How do I use dotenv?';

describe('Threads (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const httpServer = () => app.getHttpServer();

  const registerAndLogin = async (username: string, email: string) => {
    const registerRes = await request(httpServer())
      .post('/api/auth/register')
      .send({ username, email, password: PASSWORD })
      .expect(201);

    const loginRes = await request(httpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return { token: loginRes.body.accessToken, userId: registerRes.body.id };
  };

  const createThread = async (
    token: string,
    title = TITLE,
    content = CONTENT,
  ) => {
    const res = await request(httpServer())
      .post('/api/threads')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, content })
      .expect(201);
    return res.body;
  };

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

  describe('POST /api/threads', () => {
    it('creates a thread and returns 201 with author', async () => {
      const { token, userId } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );

      const res = await createThread(token);

      expect(res).toMatchObject({ title: TITLE, content: CONTENT });
      expect(res.id).toBeDefined();
      expect(res.author).toEqual({ id: userId, username: 'johndoe' });
    });

    it('returns 401 when unauthenticated', async () => {
      await request(httpServer())
        .post('/api/threads')
        .send({ title: TITLE, content: CONTENT })
        .expect(401);
    });

    it('returns 400 for an empty title', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );

      await request(httpServer())
        .post('/api/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '', content: CONTENT })
        .expect(400);
    });

    it('returns 400 for short content', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );

      await request(httpServer())
        .post('/api/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: TITLE, content: 'short' })
        .expect(400);
    });
  });

  describe('GET /api/threads', () => {
    it('lists threads publicly with pagination', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );
      await createThread(token, 'Thread one', 'Content number one');
      await createThread(token, 'Thread two', 'Content number two');
      await createThread(token, 'Thread three', 'Content number three');

      const res = await request(httpServer())
        .get('/api/threads?page=1&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.total).toBe(3);
    });

    it('applies default pagination when params are omitted', async () => {
      const res = await request(httpServer()).get('/api/threads').expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/threads/my-threads', () => {
    it('returns only the current user threads', async () => {
      const a = await registerAndLogin('alice', 'alice@example.com');
      const b = await registerAndLogin('bob', 'bob@example.com');
      await createThread(a.token, 'Alice thread', 'Alice content');
      await createThread(b.token, 'Bob thread', 'Bob content');

      const res = await request(httpServer())
        .get('/api/threads/my-threads')
        .set('Authorization', `Bearer ${a.token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Alice thread');
    });

    it('is not shadowed by the :id route (returns 401 without auth)', async () => {
      await request(httpServer()).get('/api/threads/my-threads').expect(401);
    });
  });

  describe('GET /api/threads/:id', () => {
    it('returns a thread with its author', async () => {
      const { token, userId } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );
      const created = await createThread(token);

      const res = await request(httpServer())
        .get(`/api/threads/${created.id}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: created.id, title: TITLE });
      expect(res.body.author).toEqual({ id: userId, username: 'johndoe' });
    });

    it('returns 404 for an unknown thread', async () => {
      await request(httpServer())
        .get('/api/threads/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PUT /api/threads/:id', () => {
    it('lets the owner update the thread', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );
      const created = await createThread(token);

      const res = await request(httpServer())
        .put(`/api/threads/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated title', content: 'Updated content here' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: created.id,
        title: 'Updated title',
        content: 'Updated content here',
      });
    });

    it('returns 403 for a non-owner', async () => {
      const owner = await registerAndLogin('alice', 'alice@example.com');
      const other = await registerAndLogin('bob', 'bob@example.com');
      const created = await createThread(owner.token);

      await request(httpServer())
        .put(`/api/threads/${created.id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ title: 'Hijacked', content: 'Should not work here' })
        .expect(403);
    });

    it('returns 404 for a missing thread', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );

      await request(httpServer())
        .put('/api/threads/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Nope', content: 'No thread here' })
        .expect(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );
      const created = await createThread(token);

      await request(httpServer())
        .put(`/api/threads/${created.id}`)
        .send({ title: 'Nope', content: 'No token here' })
        .expect(401);
    });
  });

  describe('DELETE /api/threads/:id', () => {
    it('lets the owner delete the thread', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );
      const created = await createThread(token);

      await request(httpServer())
        .delete(`/api/threads/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('returns 403 for a non-owner', async () => {
      const owner = await registerAndLogin('alice', 'alice@example.com');
      const other = await registerAndLogin('bob', 'bob@example.com');
      const created = await createThread(owner.token);

      await request(httpServer())
        .delete(`/api/threads/${created.id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(403);
    });

    it('returns 404 for a missing thread', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );

      await request(httpServer())
        .delete('/api/threads/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const { token } = await registerAndLogin(
        'johndoe',
        'johndoe@example.com',
      );
      const created = await createThread(token);

      await request(httpServer())
        .delete(`/api/threads/${created.id}`)
        .expect(401);
    });
  });
});
