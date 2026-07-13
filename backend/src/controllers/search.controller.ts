import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { getUserId } from '../utils/reqUser';
import { globalSearch } from '../services/search.service';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const result = await globalSearch(userId, q);
  ok(res, result);
});
