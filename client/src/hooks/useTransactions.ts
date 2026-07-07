import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, TransactionFilters, TransactionInput } from '@/services/transactions.service';
import { ApiRequestError } from '@/services/apiClient';
import { useToast } from '@/contexts/ToastContext';
import { clientKeys } from './useClients';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters?: TransactionFilters) => ['transactions', 'list', filters] as const,
  detail: (id: string) => ['transactions', 'detail', id] as const,
};

const dashboardKey = ['reports', 'dashboard'] as const;

export function useTransactionsQuery(filters?: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => transactionsApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useTransactionQuery(id: string | undefined) {
  return useQuery({
    queryKey: transactionKeys.detail(id ?? ''),
    queryFn: () => transactionsApi.get(id as string),
    enabled: Boolean(id),
  });
}

function invalidateEverything(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: transactionKeys.all });
  queryClient.invalidateQueries({ queryKey: clientKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKey });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (input: TransactionInput) => transactionsApi.create(input),
    onSuccess: () => {
      invalidateEverything(queryClient);
      showToast('Transaction recorded', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      transactionsApi.update(id, input),
    onSuccess: () => {
      invalidateEverything(queryClient);
      showToast('Transaction updated', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => {
      invalidateEverything(queryClient);
      showToast('Transaction deleted', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useUndoDeleteTransaction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.undoDelete(id),
    onSuccess: () => {
      invalidateEverything(queryClient);
      showToast('Transaction restored', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useDuplicateTransaction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.duplicate(id),
    onSuccess: () => {
      invalidateEverything(queryClient);
      showToast('Transaction duplicated', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}
