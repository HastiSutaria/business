import { apiClient, unwrap } from './apiClient';
import { PaymentMode, Settlement } from '@/types';

export interface SettlementInput {
  clientId: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  date: string;
  remarks?: string;
}

export const settlementsApi = {
  list: (clientId?: string) => unwrap<Settlement[]>(apiClient.get('/payments', { params: { clientId } })),
  create: (input: SettlementInput) => unwrap<Settlement>(apiClient.post('/payments', input)),
};
