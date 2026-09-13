import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { THREAD_CREATE_THROTTLE, THROTTLER_CONFIG } from './app.module';

interface TestRequest {
  headers: Record<string, string | undefined>;
  user?: { id: string };
}

/** Stands in for AuthGuard('jwt') so the tracker can see an authenticated user. */
class FakeUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TestRequest>();
    const id = req.headers['x-user'];
    if (id) {
      req.user = { id };
    }
    return true;
  }
}

@Controller('limited')
class LimitedController {
  @Get()
  @UseGuards(FakeUserGuard, ThrottlerGuard)
  limited() {
    return 'ok';
  }
}

describe('thread creation rate limit', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_CONFIG)],
      controllers: [LimitedController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const hit = (user: string) =>
    request(app.getHttpServer() as import('http').Server)
      .get('/limited')
      .set('x-user', user);

  it('allows the budget then returns 429', async () => {
    for (let i = 0; i < THREAD_CREATE_THROTTLE.limit; i++) {
      await hit('user-a').expect(200);
    }

    await hit('user-a').expect(429);
  });

  it('tracks a separate budget per user', async () => {
    await hit('user-b').expect(200);
  });
});
