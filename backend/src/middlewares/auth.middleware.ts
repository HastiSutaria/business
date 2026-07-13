import { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../utils/jwt';
import { AppError } from '../utils/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: { id: string; loginId: string };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    next(AppError.unauthorized('Authentication required'));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.admin = { id: payload.sub, loginId: payload.loginId };
    next();
  } catch {
    next(AppError.unauthorized('Session expired or invalid. Please log in again.'));
  }
}
