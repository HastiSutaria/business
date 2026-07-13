import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import transactionRoutes from './transaction.routes';
import settlementRoutes from './settlement.routes';
import reportRoutes from './report.routes';
import settingsRoutes from './settings.routes';
import searchRoutes from './search.routes';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);

router.use('/clients', requireAuth, clientRoutes);
router.use('/transactions', requireAuth, transactionRoutes);
router.use('/payments', requireAuth, settlementRoutes);
router.use('/reports', requireAuth, reportRoutes);
router.use('/settings', requireAuth, settingsRoutes);
router.use('/search', requireAuth, searchRoutes);

export default router;
