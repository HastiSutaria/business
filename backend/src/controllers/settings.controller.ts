import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { AppError } from '../utils/errors';
import { settingsStore } from '../database/repositories';
import * as backupService from '../services/backup.service';

const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  ownerName: z.string().trim().min(1).max(200).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  goldUnit: z.enum(['gram', 'kg']).optional(),
  silverUnit: z.enum(['gram', 'kg']).optional(),
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsStore.read();
  ok(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const updated = await settingsStore.update((current) => ({ ...current, ...parsed.data }));
  ok(res, updated);
});

export const createBackupHandler = asyncHandler(async (_req: Request, res: Response) => {
  const backup = await backupService.createBackup();
  created(res, backup);
});

export const listBackupsHandler = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, backupService.listBackups());
});

export const restoreBackupHandler = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({ fileName: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  await backupService.restoreBackup(parsed.data.fileName);
  ok(res, { restored: true });
});

export const masterResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({ confirmation: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  await backupService.masterReset(parsed.data.confirmation);
  ok(res, { reset: true });
});
