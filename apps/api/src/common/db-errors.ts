export class DbConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbConflictError';
  }
}

export class DbNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbNotFoundError';
  }
}
