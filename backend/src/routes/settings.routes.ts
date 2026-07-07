import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  createBackupHandler,
  listBackupsHandler,
  restoreBackupHandler,
  masterResetHandler,
} from '../controllers/settings.controller';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/backups', listBackupsHandler);
router.post('/backups', createBackupHandler);
router.post('/backups/restore', restoreBackupHandler);
router.post('/master-reset', masterResetHandler);

export default router;
