import { Router } from 'express';
import clientRoutes from './client.routes';
import transactionRoutes from './transaction.routes';
import settlementRoutes from './settlement.routes';
import reportRoutes from './report.routes';
import settingsRoutes from './settings.routes';
import searchRoutes from './search.routes';

const router = Router();

router.use('/clients', clientRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payments', settlementRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
