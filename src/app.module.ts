import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThreadsModule } from './threads/threads.module';

/** Thread creation budget: 5 requests per minute per authenticated user. */
export const THREAD_CREATE_THROTTLE = { ttl: 60_000, limit: 5 };

interface ThrottledRequest {
  user?: { id?: string };
  ip?: string;
}

/** Key the budget by user id so shared IPs do not throttle each other. */
const trackerByUser = (req: Record<string, any>): string => {
  const { user, ip } = req as ThrottledRequest;
  return user?.id ?? ip ?? 'unknown';
};

export const THROTTLER_CONFIG: ThrottlerModuleOptions = {
  throttlers: [{ ...THREAD_CREATE_THROTTLE, getTracker: trackerByUser }],
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot(THROTTLER_CONFIG),
    PrismaModule,
    AuthModule,
    UsersModule,
    ThreadsModule,
  ],
})
export class AppModule {}
