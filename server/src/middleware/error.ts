import type { NextFunction, Request, Response } from 'express';

// A typed error we can throw from anywhere to produce a clean HTTP response.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Wraps async route handlers so thrown/rejected errors reach the error handler
// instead of crashing the process.
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
}
