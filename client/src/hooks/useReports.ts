import { useQuery } from '@tanstack/react-query';
import { reportsApi, ReportRangeParams } from '@/services/reports.service';

export function useDashboardQuery() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportsApi.dashboard(),
    refetchInterval: 60_000,
  });
}

export function useProfitReportQuery(params?: ReportRangeParams) {
  return useQuery({
    queryKey: ['reports', 'profit', params],
    queryFn: () => reportsApi.profit(params),
  });
}

export function useMetalReportQuery(params?: ReportRangeParams) {
  return useQuery({
    queryKey: ['reports', 'metal', params],
    queryFn: () => reportsApi.metal(params),
  });
}

export function useClientReportQuery(clientId: string | undefined, params?: ReportRangeParams) {
  return useQuery({
    queryKey: ['reports', 'client', clientId, params],
    queryFn: () => reportsApi.client(clientId as string, params),
    enabled: Boolean(clientId),
  });
}
