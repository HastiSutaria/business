import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { AppError } from '../utils/errors';
import { getUserId } from '../utils/reqUser';
import { getSettingsForUser, updateSettingsForUser } from '../services/settings.service';
import * as backupService from '../services/backup.service';

const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  ownerName: z.string().trim().min(1).max(200).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  goldUnit: z.enum(['gram', 'kg']).optional(),
  silverUnit: z.enum(['gram', 'kg']).optional(),
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const settings = await getSettingsForUser(userId);
  ok(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const updated = await updateSettingsForUser(userId, parsed.data);
  ok(res, updated);
});

export const createBackupHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const backup = await backupService.createBackup(userId);
  created(res, backup);
});

export const listBackupsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  ok(res, backupService.listBackups(userId));
});

export const restoreBackupHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const schema = z.object({ fileName: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  await backupService.restoreBackup(userId, parsed.data.fileName);
  ok(res, { restored: true });
});

export const masterResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const schema = z.object({ confirmation: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  await backupService.masterReset(userId, parsed.data.confirmation);
  ok(res, { reset: true });
});
