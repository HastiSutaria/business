import { Router } from 'express';
import { getDashboard, getProfitReport, getMetalReport, getClientReport } from '../controllers/report.controller';

const router = Router();

router.get('/dashboard', getDashboard);
router.get('/profit', getProfitReport);
router.get('/metal', getMetalReport);
router.get('/client/:id', getClientReport);

export default router;
