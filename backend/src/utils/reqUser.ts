import { Request } from 'express';
import { AppError } from './errors';

/** Every route that calls this is expected to sit behind requireAuth. */
export function getUserId(req: Request): string {
  if (!req.admin) throw AppError.unauthorized();
  return req.admin.id;
}
