import { Router } from 'express';
import {
  getTransactions,
  getTransaction,
  createTransactionHandler,
  updateTransactionHandler,
  deleteTransactionHandler,
  undoDeleteTransactionHandler,
  duplicateTransactionHandler,
  exportTransactionsCsv,
} from '../controllers/transaction.controller';

const router = Router();

router.get('/export/csv', exportTransactionsCsv);
router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.post('/', createTransactionHandler);
router.post('/:id/duplicate', duplicateTransactionHandler);
router.post('/:id/undo-delete', undoDeleteTransactionHandler);
router.put('/:id', updateTransactionHandler);
router.delete('/:id', deleteTransactionHandler);

export default router;
