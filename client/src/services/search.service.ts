import { apiClient, unwrap } from './apiClient';
import { Client, Transaction } from '@/types';

export interface SearchResult {
  transactions: Transaction[];
  clients: Client[];
}

export const searchApi = {
  search: (q: string) => unwrap<SearchResult>(apiClient.get('/search', { params: { q } })),
};
