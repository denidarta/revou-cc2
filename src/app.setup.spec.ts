import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp, skipRequestLog } from './app.setup';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

describe('configureApp', () => {
  let app: INestApplication;
  let logs: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = moduleRef.createNestApplication();
    logs = [];
    configureApp(app, {
      logStream: {
        write: (message: string) => {
          logs.push(message);
        },
      },
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer() as import('http').Server;

  it('serves the swagger ui with security headers and no CSP', async () => {
    const res = await request(server()).get('/api/docs').expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('keeps security headers on api routes', async () => {
    const res = await request(server()).get('/api/ping').expect(200);

    expect(res.body).toEqual({ ok: true });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('logs api requests', async () => {
    logs.length = 0;

    await request(server()).get('/api/ping').expect(200);

    expect(logs.some((line) => line.includes('/api/ping'))).toBe(true);
    expect(logs.some((line) => line.includes('200'))).toBe(true);
  });

  it('does not log swagger ui requests', async () => {
    logs.length = 0;

    await request(server()).get('/api/docs').expect(200);

    expect(logs.some((line) => line.includes('/api/docs'))).toBe(false);
  });

  describe('skipRequestLog', () => {
    it('skips the docs paths', () => {
      expect(skipRequestLog({ url: '/api/docs' })).toBe(true);
      expect(skipRequestLog({ url: '/api/docs/swagger-ui.css' })).toBe(true);
      expect(skipRequestLog({ url: '/api/docs?x=1' })).toBe(true);
    });

    it('keeps other paths', () => {
      expect(skipRequestLog({ url: '/api/threads' })).toBe(false);
      expect(skipRequestLog({})).toBe(false);
    });
  });
});
