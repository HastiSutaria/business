import { Router } from 'express';
import { getSettlements, createSettlementHandler } from '../controllers/settlement.controller';

const router = Router();

router.get('/', getSettlements);
router.post('/', createSettlementHandler);

export default router;
