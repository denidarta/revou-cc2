export interface ThreadAuthor {
  id: string;
  username: string;
}

export interface ThreadWithAuthor {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: ThreadAuthor;
}
