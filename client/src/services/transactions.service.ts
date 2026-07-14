import { apiClient, unwrap } from './apiClient';
import { Metal, Paginated, Transaction, TransactionType } from '@/types';

export interface TransactionInput {
  clientId: string;
  metal: Metal;
  type: TransactionType;
  quantity: number;
  rate: number;
  date: string;
  time: string;
  remarks?: string;
  createdBy?: string;
}

export interface TransactionBulkInput {
  clientId: string;
  metal: Metal;
  type: TransactionType;
  date: string;
  time: string;
  remarks?: string;
  createdBy?: string;
  rows: Array<{ quantity: number; rate: number }>;
}

export interface TransactionFilters {
  metal?: Metal;
  type?: TransactionType;
  clientId?: string;
  search?: string;
  datePreset?: 'today' | 'yesterday' | 'week' | 'month';
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const transactionsApi = {
  list: (filters?: TransactionFilters) =>
    unwrap<Paginated<Transaction>>(apiClient.get('/transactions', { params: filters })),
  get: (id: string) => unwrap<Transaction>(apiClient.get(`/transactions/${id}`)),
  create: (input: TransactionInput) => unwrap<Transaction>(apiClient.post('/transactions', input)),
  createBulk: (input: TransactionBulkInput) =>
    unwrap<Transaction[]>(apiClient.post('/transactions/bulk', input)),
  update: (id: string, input: Partial<TransactionInput>) =>
    unwrap<Transaction>(apiClient.put(`/transactions/${id}`, input)),
  remove: (id: string) => unwrap<{ id: string }>(apiClient.delete(`/transactions/${id}`)),
  undoDelete: (id: string) => unwrap<Transaction>(apiClient.post(`/transactions/${id}/undo-delete`)),
  duplicate: (id: string) => unwrap<Transaction>(apiClient.post(`/transactions/${id}/duplicate`)),
  exportCsvUrl: (filters?: TransactionFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const base = (import.meta.env.VITE_API_BASE_URL ?? '/api') as string;
    return `${base}/transactions/export/csv?${params.toString()}`;
  },
};
