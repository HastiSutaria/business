import { Router } from 'express';
import {
  getClients,
  getClient,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
  getClientLedgerHandler,
  getClientsOutstandingHandler,
  getClientPendingTransactionsHandler,
} from '../controllers/client.controller';

const router = Router();

router.get('/', getClients);
router.get('/outstanding', getClientsOutstandingHandler);
router.get('/:id', getClient);
router.get('/:id/ledger', getClientLedgerHandler);
router.get('/:id/pending-transactions', getClientPendingTransactionsHandler);
router.post('/', createClientHandler);
router.put('/:id', updateClientHandler);
router.delete('/:id', deleteClientHandler);

export default router;
