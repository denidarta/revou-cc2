import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { PrismaService } from '../prisma/prisma.service';

/** Stands in for the database so the probe test needs no live Postgres. */
const prismaStub = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe('Health check', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app, { logStream: { write: () => {} } });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer() as import('http').Server;

  it('reports the service as reachable and healthy', async () => {
    const res = await request(server()).get('/api/health').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('does not require authentication', async () => {
    await request(server()).get('/api/health').expect(200);
  });
});
