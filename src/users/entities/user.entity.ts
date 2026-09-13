export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  createdAt: Date;
}
