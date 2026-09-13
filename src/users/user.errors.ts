export class DuplicateUserError extends Error {
  constructor() {
    super('username or email already exists');
    this.name = 'DuplicateUserError';
  }
}
