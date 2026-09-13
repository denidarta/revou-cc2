import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(configService);
  });

  it('maps the JWT payload to the CurrentUser shape used by controllers', () => {
    expect(strategy.validate({ sub: 'user-1', username: 'johndoe' })).toEqual({
      id: 'user-1',
      username: 'johndoe',
    });
  });
});
