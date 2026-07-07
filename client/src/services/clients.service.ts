import { apiClient, unwrap } from './apiClient';
import { Client, ClientLedgerResponse, Transaction } from '@/types';

export interface ClientOutstanding {
  client: Client;
  outstanding: number;
}

export interface ClientPendingTransactionsResponse {
  client: Client;
  transactions: Transaction[];
  outstanding: number;
}

export interface ClientInput {
  clientName: string;
  businessName: string;
  mobile: string;
  address?: string;
  gst?: string;
  openingBalance: number;
  notes?: string;
}

export interface ClientListParams {
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const clientsApi = {
  list: (params?: ClientListParams) => unwrap<Client[]>(apiClient.get('/clients', { params })),
  get: (id: string) => unwrap<Client>(apiClient.get(`/clients/${id}`)),
  create: (input: ClientInput) => unwrap<Client>(apiClient.post('/clients', input)),
  update: (id: string, input: Partial<ClientInput>) => unwrap<Client>(apiClient.put(`/clients/${id}`, input)),
  remove: (id: string) => unwrap<{ id: string }>(apiClient.delete(`/clients/${id}`)),
  ledger: (id: string) => unwrap<ClientLedgerResponse>(apiClient.get(`/clients/${id}/ledger`)),
  outstanding: () => unwrap<ClientOutstanding[]>(apiClient.get('/clients/outstanding')),
  pendingTransactions: (id: string) =>
    unwrap<ClientPendingTransactionsResponse>(apiClient.get(`/clients/${id}/pending-transactions`)),
};
