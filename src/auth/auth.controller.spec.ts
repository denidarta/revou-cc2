import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: jest.Mock; login: jest.Mock };

  beforeEach(async () => {
    authService = { register: jest.fn(), login: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('delegates register to AuthService unchanged', async () => {
    const dto = {
      username: 'johndoe',
      email: 'johndoe@example.com',
      password: 'password123',
    };
    const registered = { id: 'user-1', username: dto.username };
    authService.register.mockResolvedValue(registered);

    await expect(controller.register(dto)).resolves.toBe(registered);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('delegates login to AuthService unchanged', async () => {
    const dto = { email: 'johndoe@example.com', password: 'password123' };
    const loggedIn = { accessToken: 'signed.jwt.token' };
    authService.login.mockResolvedValue(loggedIn);

    await expect(controller.login(dto)).resolves.toBe(loggedIn);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});
