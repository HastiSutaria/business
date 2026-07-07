import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { AppError } from '../utils/errors';
import { settlementSchema } from '../validators/settlement.validator';
import * as settlementService from '../services/settlement.service';

export const getSettlements = asyncHandler(async (req: Request, res: Response) => {
  const { clientId } = req.query;
  let settlements = await settlementService.listSettlements();
  if (typeof clientId === 'string' && clientId) {
    settlements = settlements.filter((s) => s.clientId === clientId);
  }
  settlements = [...settlements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, settlements);
});

export const createSettlementHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = settlementSchema.safeParse(req.body);
  if (!parsed.success) throw AppError.validation(parsed.error.flatten());
  const settlement = await settlementService.createSettlement(parsed.data);
  created(res, settlement);
});
