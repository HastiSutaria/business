import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi, ClientInput, ClientListParams } from '@/services/clients.service';
import { ApiRequestError } from '@/services/apiClient';
import { useToast } from '@/contexts/ToastContext';

export const clientKeys = {
  all: ['clients'] as const,
  list: (params?: ClientListParams) => ['clients', 'list', params] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
  ledger: (id: string) => ['clients', 'ledger', id] as const,
  outstanding: ['clients', 'outstanding'] as const,
  pending: (id: string) => ['clients', 'pending', id] as const,
};

export function useClientsQuery(params?: ClientListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => clientsApi.list(params),
  });
}

export function useClientQuery(id: string | undefined) {
  return useQuery({
    queryKey: clientKeys.detail(id ?? ''),
    queryFn: () => clientsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useClientLedgerQuery(id: string | undefined) {
  return useQuery({
    queryKey: clientKeys.ledger(id ?? ''),
    queryFn: () => clientsApi.ledger(id as string),
    enabled: Boolean(id),
  });
}

export function useClientsOutstandingQuery() {
  return useQuery({
    queryKey: clientKeys.outstanding,
    queryFn: () => clientsApi.outstanding(),
  });
}

export function useClientPendingTransactionsQuery(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: clientKeys.pending(id ?? ''),
    queryFn: () => clientsApi.pendingTransactions(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (input: ClientInput) => clientsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      showToast('Client added successfully', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ClientInput> }) => clientsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      showToast('Client updated successfully', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      showToast('Client deleted', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}
