import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { AppError } from '../utils/errors';
import { loginSchema } from '../validators/auth.validator';
import { verifyLogin } from '../services/auth.service';
import { signAuthToken } from '../utils/jwt';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());

  const admin = await verifyLogin(parsed.data.loginId, parsed.data.password);
  const { token, expiresAt } = signAuthToken({ sub: admin.id, loginId: admin.loginId });

  ok(res, { token, expiresAt, loginId: admin.loginId });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  ok(res, { loginId: req.admin?.loginId });
});
