import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settlementsApi, SettlementInput } from '@/services/settlements.service';
import { ApiRequestError } from '@/services/apiClient';
import { useToast } from '@/contexts/ToastContext';
import { clientKeys } from './useClients';

export const settlementKeys = {
  all: ['settlements'] as const,
  list: (clientId?: string) => ['settlements', 'list', clientId] as const,
};

export function useSettlementsQuery(clientId?: string) {
  return useQuery({
    queryKey: settlementKeys.list(clientId),
    queryFn: () => settlementsApi.list(clientId),
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (input: SettlementInput) => settlementsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.all });
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      showToast('Settlement recorded, outstanding updated', 'success');
    },
    onError: (err: ApiRequestError) => showToast(err.message, 'error'),
  });
}
